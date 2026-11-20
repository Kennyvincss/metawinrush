import * as Phaser from "phaser";
import { paintCharacterBack, type BackPose } from "@/lib/art/character";
import { COIN_SCORE, POWERUP_DURATION, distanceMultiplier, type PowerUpKind, type RunResult } from "@/lib/rules";
import { getItem } from "@/lib/data/cosmetics";
import { audio } from "./audio/engine";
import { makeCanvas } from "./art/canvas";
import { buildCityKit, releaseOtherKits, type CityKit, type ObstacleArt, type WallStyle } from "./art/kits";
import { CITIES, type CityId } from "@/lib/data/cities";
import { paintFx, paintPortal, paintPowerUp, PORTAL_H, PORTAL_W, POWERUP_COLORS } from "./art/props";
import { BLD_PX } from "./art/buildings";
import { Character3D, TARGET_HEIGHT, type Anim } from "./character3d";
import {
  CAM_BACK,
  CAM_HEIGHT,
  DRAW_DIST,
  GEN_LOOKAHEAD,
  JUMP_HEIGHT,
  JUMP_TIME,
  LANE_CHANGE_TIME,
  LANE_W,
  MOVING_TRIGGER,
  PLAYER_H,
  PLAYER_HALF_D,
  PLAYER_HALF_W,
  PLAYER_SLIDE_H,
  PX_PER_M,
  ROAD_HALF,
  SLIDE_TIME,
  SUPER_JUMP_HEIGHT,
  SUPER_JUMP_TIME,
  laneX,
} from "./core/constants";
import { TrackGenerator, mulberry32, speedAt, type GenObstacle } from "./core/generator";
import type { GameAction, GameCallbacks, HudState, LaunchConfig } from "./types";

const NEAR = 0.6;
/** Meters per city in a world-tour run. */
export const LEG_LENGTH = 800;
const RUNWAY = 70; // obstacle-free stretch before each portal and after each arrival
const SEG = 4;

interface Obs {
  gen: GenObstacle;
  art: ObstacleArt;
  x: number;
  z: number;
  img: Phaser.GameObjects.Image;
  g: Phaser.GameObjects.Graphics | null;
  moving: boolean;
  passed: boolean;
  dead: boolean;
}

interface Coin {
  x: number;
  y: number;
  z: number;
  img: Phaser.GameObjects.Image;
  pulled: boolean;
  dead: boolean;
}

interface Pu {
  kind: PowerUpKind;
  x: number;
  z: number;
  img: Phaser.GameObjects.Image;
  dead: boolean;
}

interface Scenery {
  img: Phaser.GameObjects.Image;
  x: number;
  z: number;
  w: number;
  h: number;
  side: number;
  wall?: { g: Phaser.GameObjects.Graphics; depth: number; color: number; trim: number; lit: number[]; neon: number; style: WallStyle; seed: number };
}

interface Particle {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  gravity: number;
  screen: boolean; // screen-space particle (ambient)
}

type Phase = "intro" | "run" | "crash" | "ended";

const hex = (s: string) => parseInt(s.slice(1, 7), 16);
function mix(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}
const mod = (a: number, n: number) => ((a % n) + n) % n;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export class RunScene extends Phaser.Scene {
  private cfg!: LaunchConfig;
  private cb!: GameCallbacks;
  private kit!: CityKit;
  private gen!: TrackGenerator;
  private rand!: () => number;

  // screen / camera
  private W = 1;
  private H = 1;
  private horizon = 0;
  private focal = 1;
  private camX = 0;
  private camH = CAM_HEIGHT;
  private camBack = CAM_BACK;
  private curveK = 0;
  private bgScroll = 0;
  private shake = 0;

  // display objects
  private sky!: Phaser.GameObjects.Image;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private road!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Rectangle;

  // world
  private obstacles: Obs[] = [];
  private coins: Coin[] = [];
  private pus: Pu[] = [];
  private scenery: Scenery[] = [];
  private particles: Particle[] = [];
  private imgPool: Phaser.GameObjects.Image[] = [];
  private gfxPool: Phaser.GameObjects.Graphics[] = [];
  private sceneryCursor = [0, 0];
  private propCursor: number[] = [];

  // player
  private phase: Phase = "intro";
  private introT = 0;
  private crashT = 0;
  private dist = 0;
  private speed = 0;
  private lane = 1;
  private laneFrom = 1;
  private laneT = 1;
  private px = 0;
  private py = 0;
  private jumpT = -1;
  private jumpDur = JUMP_TIME;
  private jumpH = JUMP_HEIGHT;
  private slideT = -1;
  private fastFall = false;
  private runPhase = 0;
  private stumbleAt = -99;
  private invuln = 0;
  private queued: GameAction | null = null;

  // run stats
  private score = 0;
  private coinCount = 0;
  private elapsed = 0;
  private powerupsUsed = 0;
  private jumps = 0;
  private slides = 0;
  private dodges = 0;
  private laneChanges = 0;
  private boostSeconds = 0;
  private active: Partial<Record<PowerUpKind, number>> = {};
  private shield = false;
  private hudTimer = 0;
  private trailTimer = 0;

  // world tour: the run moves from city to city through portals
  private cityId!: CityId;
  private tour: CityId[] = [];
  private leg = 0;
  private nextLegZ = 0;
  private legStartZ = 0;
  private route: { city: CityId; distance: number }[] = [];
  private portal: { img: Phaser.GameObjects.Image; z: number; key: string } | null = null;
  private speedFloor = 0;

  // 3D runner (falls back to 2D sprites if WebGL/model is unavailable)
  private c3: Character3D | null = null;
  private c3Anim: Anim | null = null;
  private stumbleT = 0;
  private frameDt = 0;
  private c3Dt = 0; // animation time accumulated while a 3D frame is skipped
  private c3Skip = false;
  private avgFrameMs = 16;

  // tutorial
  private tutorialStep = -1;
  private tutorialFrozen = false;
  private tutorialObsZ = 0;

  constructor() {
    super("run");
  }

  init(data: { cfg: LaunchConfig; cb: GameCallbacks }) {
    this.cfg = data.cfg;
    this.cb = data.cb;
    this.obstacles = [];
    this.coins = [];
    this.pus = [];
    this.scenery = [];
    this.particles = [];
    this.imgPool = [];
    this.gfxPool = [];
    this.phase = "intro";
    this.introT = 0;
    this.crashT = 0;
    this.dist = 0;
    this.speed = 0;
    this.lane = this.laneFrom = 1;
    this.laneT = 1;
    this.px = 0;
    this.py = 0;
    this.jumpT = -1;
    this.slideT = -1;
    this.fastFall = false;
    this.stumbleAt = -99;
    this.invuln = 0;
    this.queued = null;
    this.score = this.coinCount = this.elapsed = this.powerupsUsed = this.jumps = this.slides = this.dodges = this.laneChanges = this.boostSeconds = 0;
    this.active = {};
    this.shield = false;
    this.camX = 0;
    this.camH = 14;
    this.camBack = 26;
    this.curveK = 0;
    this.bgScroll = 0;
    this.shake = 0;
    this.tutorialStep = this.cfg.tutorial ? 0 : -1;
    this.tutorialFrozen = false;
    this.cityId = this.cfg.city;
    const start = CITIES.findIndex((c) => c.id === this.cfg.city);
    this.tour = CITIES.map((_, i) => CITIES[(start + i) % CITIES.length].id);
    this.leg = 0;
    this.legStartZ = 0;
    this.nextLegZ = this.cfg.tutorial ? Number.POSITIVE_INFINITY : LEG_LENGTH;
    this.route = [];
    this.portal = null;
    this.speedFloor = 0;
    this.tutorialObsZ = 0;
    resetTutorial();
  }

  // ── Textures ────────────────────────────────────────────────────────────
  private addTex(key: string, canvas: HTMLCanvasElement) {
    if (this.textures.exists(key)) return;
    this.textures.addCanvas(key, canvas);
  }

  private unloadCitiesExcept(id: CityId) {
    releaseOtherKits(id);
    for (const key of this.textures.getTextureKeys()) {
      const m = /^city:([a-z]+):/.exec(key);
      if (m && m[1] !== id) this.textures.remove(key);
    }
  }

  private prepareTextures() {
    this.unloadCitiesExcept(this.cfg.city);
    this.loadCity(this.cfg.city);
    if (!this.textures.exists("fx:dot")) {
      const fx = paintFx();
      for (const [name, c] of Object.entries(fx)) this.addTex(`fx:${name}`, c);
      for (const kind of Object.keys(POWERUP_COLORS) as PowerUpKind[]) this.addTex(`pu:${kind}`, paintPowerUp(kind));
    }
    this.prepareRunnerFrames();
  }

  /** Build (or reuse) a city's art kit and register its textures. */
  private loadCity(id: CityId) {
    this.kit = buildCityKit(id);
    const k = this.kit;
    const p = `city:${id}:`;
    this.addTex(p + "sky", k.sky);
    this.addTex(p + "far", k.skylineFar);
    this.addTex(p + "near", k.skylineNear);
    this.addTex(p + "coin", k.coin);
    k.buildings.forEach((b, i) => this.addTex(`${p}bld${i}`, b.canvas));
    k.props.forEach((pr, i) => this.addTex(`${p}prop${i}`, pr.tex.canvas));
    for (const kind of Object.keys(k.art) as (keyof CityKit["art"])[]) k.art[kind].forEach((a, i) => this.addTex(`${p}${kind}${i}`, a.canvas));
  }

  private prepareRunnerFrames() {
    // runner frames for the equipped look (2D fallback)
    const rk = `runner:${this.cfg.characterId}:${this.cfg.helmet}:`;
    if (!this.textures.exists(rk + "run0")) {
      const poses: [string, BackPose][] = [];
      for (let i = 0; i < 8; i++) poses.push([`run${i}`, { kind: "run", phase: i / 8 }]);
      poses.push(["jump", { kind: "jump", t: 0.5 }], ["slide", { kind: "slide", t: 0.5 }], ["crash", { kind: "crash" }]);
      for (const [name, pose] of poses) {
        const [c, ctx] = makeCanvas(320, 480);
        ctx.scale(2, 2);
        paintCharacterBack(ctx, this.cfg.look, this.cfg.helmet, pose);
        this.addTex(rk + name, c);
      }
    }
  }

  private runnerKey(name: string) {
    return `runner:${this.cfg.characterId}:${this.cfg.helmet}:${name}`;
  }

  // ── Create ──────────────────────────────────────────────────────────────
  create() {
    this.prepareTextures();
    const id = this.cfg.city;
    const pal = this.kit.city.palette;
    this.cameras.main.setBackgroundColor(pal.skyTop);
    this.sky = this.add.image(0, 0, `city:${id}:sky`).setOrigin(0, 0).setDepth(-300);
    this.far = this.add.tileSprite(0, 0, 10, 10, `city:${id}:far`).setOrigin(0, 1).setDepth(-250);
    this.near = this.add.tileSprite(0, 0, 10, 10, `city:${id}:near`).setOrigin(0, 1).setDepth(-240);
    this.road = this.add.graphics().setDepth(-100);
    this.shadow = this.add.image(0, 0, "fx:shadow").setDepth(5000);
    this.player = this.add.image(0, 0, this.runnerKey("run0")).setOrigin(0.5, 472 / 480).setDepth(9500);
    this.aura = this.add.image(0, 0, "fx:ring").setDepth(9600).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.flash = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0, 0).setDepth(30000);
    this.c3 = Character3D.instance;
    this.c3Anim = null;
    if (this.c3) {
      this.c3.setLook(this.cfg.look, this.cfg.helmet);
      this.c3.setRimColors(pal.neon[0], pal.neon[1 % pal.neon.length]);
      if (this.textures.exists("runner3d")) this.textures.remove("runner3d");
      this.textures.addImage("runner3d", this.c3.canvas as unknown as HTMLImageElement);
    }

    this.gen = new TrackGenerator(this.cfg.seed, this.kit.city.difficulty, this.kit.catalog, this.cfg.tutorial ? 360 : 70);
    this.rand = mulberry32(this.cfg.seed ^ 0x9e3779b9);
    this.sceneryCursor = [-20, -14];
    this.propCursor = this.kit.props.map(() => -10 + this.rand() * 20);

    this.layout();
    this.scale.on("resize", this.layout, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.layout, this));

    // ambience particles
    for (let i = 0; i < 70; i++) this.spawnAmbient(true);

    audio.setEnabled(this.cfg.music, this.cfg.sfx);
    audio.playMusic(id);
    audio.play("whoosh");
    this.cb.onReady();
    if (this.cfg.tutorial) this.cb.onTutorial(null);
  }

  private layout() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    // Portrait: zoom so the three lane centres sit well inside the screen; keep the runner near the bottom.
    const roadWidthAtPlayer = LANE_W * 3 + 0.6;
    const sW = (this.W * 1.2) / roadWidthAtPlayer; // outer lanes stay on screen; hero reads bigger
    const feetY = this.H * 0.8;
    const sH = (feetY - this.H * 0.3) / CAM_HEIGHT;
    const s = Math.min(sW, sH);
    this.focal = s * CAM_BACK;
    this.horizon = feetY - CAM_HEIGHT * s;
    const skyScale = Math.max(this.W / 1024, (this.horizon + 40) / 1024);
    this.sky.setScale(skyScale * 1.02).setPosition(0, this.horizon + 40 - 1024 * skyScale);
    const farScale = Math.min(1.2, Math.max(0.5, this.H / 1300));
    this.far.setSize(this.W, 760 * farScale).setTileScale(farScale, farScale);
    this.near.setSize(this.W, 420 * farScale).setTileScale(farScale, farScale);
    this.far.setPosition(0, this.horizon + 2);
    this.near.setPosition(0, this.horizon + 2);
    this.flash.setSize(this.W, this.H);
  }

  // ── Projection ─────────────────────────────────────────────────────────
  private camZ() {
    return this.dist - this.camBack;
  }

  private proj(x: number, y: number, z: number): { x: number; y: number; s: number } | null {
    const dz = z - this.camZ();
    if (dz < NEAR * 0.98) return null;
    const s = this.focal / dz;
    const curve = this.curveK * dz * dz;
    return { x: this.W / 2 + (x - this.camX + curve) * s, y: this.horizon + (this.camH - y) * s, s };
  }

  private depthFor(dz: number) {
    return 10000 - dz * 40;
  }

  private fogT(dz: number) {
    return smooth(DRAW_DIST * 0.45, DRAW_DIST, dz);
  }

  // ── Pools ──────────────────────────────────────────────────────────────
  private getImg(key: string) {
    const img = this.imgPool.pop() ?? this.add.image(0, 0, key);
    img.setTexture(key).setVisible(true).setAlpha(1).setAngle(0).setOrigin(0.5, 1).clearTint().setBlendMode(Phaser.BlendModes.NORMAL).setFlipX(false);
    return img;
  }
  private freeImg(img: Phaser.GameObjects.Image) {
    img.setVisible(false);
    this.imgPool.push(img);
  }
  private getGfx() {
    const g = this.gfxPool.pop() ?? this.add.graphics();
    g.clear().setVisible(true);
    return g;
  }
  private freeGfx(g: Phaser.GameObjects.Graphics) {
    g.clear().setVisible(false);
    this.gfxPool.push(g);
  }

  // ── Input ──────────────────────────────────────────────────────────────
  action(a: GameAction) {
    if (this.phase === "crash" || this.phase === "ended") return;
    if (this.phase === "intro") {
      this.queued = a;
      return;
    }
    if (this.tutorialFrozen) {
      const step = TUTORIAL[this.tutorialStep];
      if (!step || step.action !== a) return;
      this.tutorialFrozen = false;
      this.cb.onTutorial(null);
    }
    switch (a) {
      case "left":
      case "right": {
        const target = Phaser.Math.Clamp(this.lane + (a === "left" ? -1 : 1), 0, 2);
        if (target === this.lane) return;
        this.laneFrom = this.lane;
        this.lane = target;
        this.laneT = 0;
        this.laneStartX = this.px;
        this.laneChanges++;
        audio.play("lane");
        break;
      }
      case "jump": {
        if (this.jumpT >= 0 && this.py > 0.05) return;
        if (this.slideT >= 0) this.slideT = -1;
        this.jumpT = 0;
        this.fastFall = false;
        const sup = !!this.active.superjump;
        this.jumpDur = sup ? SUPER_JUMP_TIME : JUMP_TIME;
        this.jumpH = sup ? SUPER_JUMP_HEIGHT : JUMP_HEIGHT;
        this.jumps++;
        audio.play(sup ? "superjump" : "jump");
        this.jumpFx();
        break;
      }
      case "slide":
        if (this.jumpT >= 0) {
          this.fastFall = true; // drop out of the air, then slide on landing
        }
        this.slideT = 0;
        this.slides++;
        audio.play("slide");
        break;
    }
  }

  private laneStartX = 0;

  // ── Update ─────────────────────────────────────────────────────────────
  update(_t: number, deltaMs: number) {
    let dt = Math.min(0.05, deltaMs / 1000);
    if (this.tutorialFrozen) dt = 0;
    if (this.phase === "crash") dt *= 0.35;
    this.frameDt = dt;
    this.avgFrameMs += (deltaMs - this.avgFrameMs) * 0.05;

    if (this.phase === "intro") this.updateIntro(dt);
    else if (this.phase === "run") this.updateRun(dt);
    else if (this.phase === "crash") this.updateCrash(dt);

    this.updateWorld(dt);
    this.render3D(deltaMs / 1000);
  }

  private updateIntro(dt: number) {
    this.introT += dt;
    const t = Math.min(1, this.introT / 1.5);
    const e = 1 - Math.pow(1 - t, 3);
    this.camH = 14 + (CAM_HEIGHT - 14) * e;
    this.camBack = 26 + (CAM_BACK - 26) * e;
    this.speed = speedAt(this.kit.city.difficulty, 0) * e;
    this.dist += this.speed * dt;
    this.runPhase += dt * (1 + this.speed / 6);
    // warp streaks
    if (this.introT < 1.1 && Math.random() < 0.9) this.warpStreak();
    if (this.introT >= 1.5) {
      this.phase = "run";
      this.camH = CAM_HEIGHT;
      this.camBack = CAM_BACK;
      if (this.queued) {
        const q = this.queued;
        this.queued = null;
        this.action(q);
      }
    }
  }

  private updateRun(dt: number) {
    const diff = this.kit.city.difficulty;
    this.elapsed += dt * 1000;
    // Speed never drops when the tour enters an easier city.
    this.speed = this.cfg.tutorial && this.tutorialStep >= 0 ? diff.baseSpeed : Math.max(this.speedFloor, speedAt(diff, this.dist));
    if (this.tutorialStep < 0) this.speedFloor = this.speed;
    const dd = this.speed * dt;
    this.dist += dd;
    const boost = !!this.active.scoreboost;
    this.score += dd * distanceMultiplier(this.dist) * (boost ? 2 : 1);
    if (boost) this.boostSeconds += dt;
    audio.intensity = Math.min(1, (this.speed - diff.baseSpeed) / (diff.maxSpeed - diff.baseSpeed) + 0.2);

    // power-up timers
    for (const k of Object.keys(this.active) as PowerUpKind[]) {
      this.active[k]! -= dt;
      if (this.active[k]! <= 0) {
        delete this.active[k];
        if (k === "shield") this.shield = false;
      }
    }
    if (this.invuln > 0) this.invuln -= dt;

    // lane movement
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / LANE_CHANGE_TIME);
      const e = 1 - Math.pow(1 - this.laneT, 2);
      this.px = this.laneStartX + (laneX(this.lane) - this.laneStartX) * e;
    } else this.px = laneX(this.lane);

    // jump / slide
    if (this.jumpT >= 0) {
      if (this.fastFall) {
        this.py = Math.max(0, this.py - 22 * dt);
        if (this.py <= 0) {
          this.jumpT = -1;
          this.fastFall = false;
        }
      } else {
        this.jumpT += dt;
        const t = this.jumpT / this.jumpDur;
        this.py = t >= 1 ? 0 : this.jumpH * 4 * t * (1 - t);
        if (t >= 1) {
          this.jumpT = -1;
          this.landFx();
        }
      }
    }
    if (this.slideT >= 0 && this.jumpT < 0) {
      this.slideT += dt;
      if (this.slideT >= SLIDE_TIME) this.slideT = -1;
      else this.slideFx(dt);
    }
    this.runPhase += dt * (0.9 + this.speed / 14);

    // generation
    if (this.tutorialStep >= 0) this.updateTutorial();
    else {
      // Stop building track before the portal so every city change has a clear runway.
      const limit = Math.min(this.dist + GEN_LOOKAHEAD, this.nextLegZ - RUNWAY);
      const runwayStart = this.nextLegZ - RUNWAY + 20;
      const batch = this.gen.generate(limit, (z) => Math.max(this.speedFloor, speedAt(diff, z)));
      for (const o of batch.obstacles) if (o.z + o.len < runwayStart) this.spawnObstacle(o);
      for (const c of batch.coins) if (c.z < runwayStart) this.spawnCoin(laneX(c.lane), c.y, c.z);
      for (const p of batch.powerups) if (p.z < runwayStart) this.spawnPowerUp(p.kind, laneX(p.lane), p.z);
      if (!this.portal && this.nextLegZ - this.dist < DRAW_DIST + 30) this.spawnPortal();
      if (this.dist >= this.nextLegZ) this.enterNextCity();
    }

    this.collide(this.dist - dd);
    this.trailFx(dt);

    // gentle road curvature after the first stretch
    const targetK = this.dist < 250 ? 0 : 0.00055 * Math.sin(this.dist / 520) * Math.sin(this.dist / 1310 + 1.3);
    this.curveK += (targetK - this.curveK) * Math.min(1, dt * 0.8);
    this.bgScroll += this.curveK * this.speed * dt * 900;

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.cb.onHud(this.hud());
    }
  }

  private updateCrash(dt: number) {
    this.crashT += dt / 0.35; // real seconds
    this.speed *= Math.pow(0.02, dt);
    this.dist += this.speed * dt;
    if (this.crashT > 1.3 && this.phase === "crash") {
      this.phase = "ended";
      audio.intensity = 0;
      this.cb.onHud(this.hud());
      this.cb.onEnd(this.result());
    }
  }

  hud(): HudState {
    return {
      score: Math.floor(this.score),
      coins: this.coinCount,
      distance: Math.floor(this.dist),
      multiplier: distanceMultiplier(this.dist) * (this.active.scoreboost ? 2 : 1),
      speed: this.speed,
      powerups: (Object.keys(this.active) as PowerUpKind[]).map((k) => ({ kind: k, remaining: this.active[k]!, total: POWERUP_DURATION[k] })),
      shield: this.shield,
      elapsedMs: this.elapsed,
      powerupsUsed: this.powerupsUsed,
      jumps: this.jumps,
      slides: this.slides,
      dodges: this.dodges,
      city: this.cityId,
      nextCity: this.tour[(this.leg + 1) % this.tour.length],
      toNext: Number.isFinite(this.nextLegZ) ? Math.max(0, Math.floor(this.nextLegZ - this.dist)) : -1,
    };
  }

  private result(): RunResult {
    const route = [...this.route, { city: this.cityId, distance: Math.max(0, Math.floor(this.dist - this.legStartZ)) }].filter((l, i) => i === 0 || l.distance > 0);
    return {
      sessionId: this.cfg.sessionId,
      city: this.cfg.city,
      score: Math.floor(this.score),
      distance: Math.floor(this.dist),
      coins: this.coinCount,
      durationMs: Math.floor(this.elapsed),
      powerupsUsed: this.powerupsUsed,
      jumps: this.jumps,
      slides: this.slides,
      dodges: this.dodges,
      laneChanges: this.laneChanges,
      boostSeconds: Math.round(this.boostSeconds * 10) / 10,
      tutorial: this.cfg.tutorial,
      route,
    };
  }

  // ── World tour ─────────────────────────────────────────────────────────
  private spawnPortal() {
    const next = CITIES.find((c) => c.id === this.tour[(this.leg + 1) % this.tour.length])!;
    const key = `portal:${this.leg}`;
    if (!this.textures.exists(key)) this.addTex(key, paintPortal(next));
    const img = this.getImg(key);
    this.portal = { img, z: this.nextLegZ, key };
    // a coin trail leads into the gate
    for (let i = 0; i < 12; i++) this.spawnCoin(0, 0.9, this.nextLegZ - RUNWAY + 18 + i * 3.2);
  }

  /** Swap the whole world to the next city while the warp flash covers the screen. */
  private enterNextCity() {
    const prev = this.cityId;
    this.route.push({ city: prev, distance: Math.floor(this.nextLegZ - this.legStartZ) });
    this.leg++;
    const id = this.tour[this.leg % this.tour.length];
    this.cityId = id;
    this.legStartZ = this.nextLegZ;
    this.nextLegZ = this.legStartZ + LEG_LENGTH;

    // flash + warp streaks hide the swap
    this.flash.setFillStyle(0xffffff, 1);
    this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 650, ease: "Quad.easeOut" });
    audio.play("whoosh");

    // clear the old city
    for (const s of this.scenery) {
      this.freeImg(s.img);
      if (s.wall) this.freeGfx(s.wall.g);
    }
    this.scenery = [];
    for (const o of this.obstacles) o.dead = true;
    for (const c of this.coins) c.dead = true;
    for (const p of this.pus) p.dead = true;
    for (const p of this.particles) if (p.screen) p.life = 0;
    if (this.portal) {
      const old = this.portal;
      this.portal = null;
      this.time.delayedCall(800, () => {
        this.freeImg(old.img);
        if (this.textures.exists(old.key)) this.textures.remove(old.key);
      });
    }

    // load the new one
    this.loadCity(id);
    const pal = this.kit.city.palette;
    this.cameras.main.setBackgroundColor(pal.skyTop);
    this.sky.setTexture(`city:${id}:sky`);
    this.far.setTexture(`city:${id}:far`);
    this.near.setTexture(`city:${id}:near`);
    this.layout();
    this.sceneryCursor = [this.dist - 25, this.dist - 18];
    this.propCursor = this.kit.props.map(() => this.dist - 10 + this.rand() * 20);
    this.gen = new TrackGenerator((this.cfg.seed + this.leg * 7919) >>> 0, this.kit.city.difficulty, this.kit.catalog, this.dist + RUNWAY);
    this.c3?.setRimColors(pal.neon[0], pal.neon[1 % pal.neon.length]);
    audio.playMusic(id);
    for (let i = 0; i < 16; i++) this.warpStreak();
    this.cb.onCityChange?.(id, this.leg);

    // free the previous city's textures once nothing references them
    this.time.delayedCall(900, () => {
      if (this.cityId !== prev) {
        for (const key of this.textures.getTextureKeys()) if (key.startsWith(`city:${prev}:`)) this.textures.remove(key);
        releaseOtherKits(this.cityId);
      }
    });
  }

  // ── Tutorial ───────────────────────────────────────────────────────────
  private updateTutorial() {
    const step = TUTORIAL[this.tutorialStep];
    if (!step) {
      // finished: hand over to the normal generator just ahead of the player
      this.tutorialStep = -1;
      this.gen.cursor = this.dist + 40;
      this.nextLegZ = this.dist + LEG_LENGTH;
      this.cb.onTutorial({ done: true });
      return;
    }
    if (!this.tutorialObsZ) {
      this.tutorialObsZ = this.dist + 70;
      for (const [lane, kind] of step.obstacles) {
        const g: GenObstacle = { id: Math.floor(this.rand() * 1e9), kind, variant: 0, lane, z: this.tutorialObsZ, len: this.kit.catalog[kind][0].len, speed: 0 };
        this.spawnObstacle(g);
      }
      for (let i = 0; i < 6; i++) this.spawnCoin(laneX(step.coinLane), 0.9, this.tutorialObsZ - 40 + i * 3.2);
      return;
    }
    const ahead = this.tutorialObsZ - this.dist;
    const trigger = step.action === "jump" ? this.speed * JUMP_TIME * 0.5 : step.action === "slide" ? 5 : 14;
    if (!step.prompted && ahead <= trigger) {
      step.prompted = true;
      const already = (step.action === "left" && this.lane === 0) || (step.action === "right" && this.lane !== 0);
      if (!already) {
        this.tutorialFrozen = true;
        this.cb.onTutorial({ action: step.action, text: step.text, index: this.tutorialStep, total: TUTORIAL.length });
      }
    }
    if (ahead < -8) {
      this.tutorialStep++;
      this.tutorialObsZ = 0;
    }
  }

  // ── Spawning ───────────────────────────────────────────────────────────
  private spawnObstacle(o: GenObstacle) {
    const art = this.kit.art[o.kind][o.variant];
    const img = this.getImg(`city:${this.cityId}:${o.kind}${o.variant}`);
    const g = art.box ? this.getGfx() : null;
    this.obstacles.push({ gen: o, art, x: laneX(o.lane), z: o.z, img, g, moving: false, passed: false, dead: false });
  }

  private spawnCoin(x: number, y: number, z: number) {
    const img = this.getImg(`city:${this.cityId}:coin`);
    img.setOrigin(0.5, 0.5);
    this.coins.push({ x, y, z, img, pulled: false, dead: false });
  }

  private spawnPowerUp(kind: PowerUpKind, x: number, z: number) {
    const img = this.getImg(`pu:${kind}`);
    img.setOrigin(0.5, 0.5);
    this.pus.push({ kind, x, z, img, dead: false });
  }

  private updateWorld(dt: number) {
    const camZ = this.camZ();
    // scenery generation (both sides)
    const k = this.kit;
    for (let side = 0; side < 2; side++) {
      while (this.sceneryCursor[side] < this.dist + DRAW_DIST + 20) {
        const b = k.buildings[Math.floor(this.rand() * k.buildings.length)];
        const bi = k.buildings.indexOf(b);
        const sgn = side === 0 ? -1 : 1;
        const gap = k.buildingGap + this.rand() * 1.5;
        const x = sgn * (ROAD_HALF + gap + b.w / 2);
        const img = this.getImg(`city:${this.cityId}:bld${bi}`);
        const st = k.street;
        const depthM = st.depth[0] + this.rand() * (st.depth[1] - st.depth[0]);
        const g = this.getGfx();
        const pal = k.city.palette;
        this.scenery.push({
          img,
          x,
          z: this.sceneryCursor[side],
          w: b.w,
          h: b.h * st.heightScale,
          side: sgn,
          wall: {
            g,
            depth: depthM,
            color: hex(st.colors[Math.floor(this.rand() * st.colors.length)]),
            trim: hex(st.trim),
            lit: pal.windowLit.map(hex),
            neon: hex(pal.neon[Math.floor(this.rand() * pal.neon.length)]),
            style: st.wall,
            seed: Math.floor(this.rand() * 1000),
          },
        });
        this.sceneryCursor[side] += depthM + st.alley[0] + this.rand() * (st.alley[1] - st.alley[0]);
      }
    }
    k.props.forEach((pr, i) => {
      while (this.propCursor[i] < this.dist + DRAW_DIST + 10) {
        const sides = pr.sides === "both" ? [-1, 1] : pr.sides === "left" ? [-1] : [1];
        const sgn = sides[Math.floor(this.rand() * sides.length)];
        const img = this.getImg(`city:${this.cityId}:prop${i}`);
        this.scenery.push({ img, x: sgn * (ROAD_HALF + pr.offset + pr.tex.w / 2), z: this.propCursor[i], w: pr.tex.w, h: pr.tex.h, side: sgn });
        this.propCursor[i] += pr.spacing * (0.6 + this.rand() * 0.8);
      }
    });

    // moving vehicles
    for (const o of this.obstacles) {
      if (o.gen.speed > 0 && (o.moving || o.z - this.dist < MOVING_TRIGGER)) {
        o.moving = true;
        o.z -= o.gen.speed * dt;
      }
    }

    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.size += p.grow * dt;
    }

    // cleanup
    const behind = camZ + NEAR;
    this.obstacles = this.obstacles.filter((o) => {
      if (o.dead || o.z + o.gen.len < behind - 2) {
        this.freeImg(o.img);
        if (o.g) this.freeGfx(o.g);
        return false;
      }
      return true;
    });
    this.coins = this.coins.filter((c) => {
      if (c.dead || c.z < behind) {
        this.freeImg(c.img);
        return false;
      }
      return true;
    });
    this.pus = this.pus.filter((p) => {
      if (p.dead || p.z < behind) {
        this.freeImg(p.img);
        return false;
      }
      return true;
    });
    this.scenery = this.scenery.filter((s) => {
      const end = s.z + (s.wall ? s.wall.depth : 0);
      if (end < behind - 1) {
        this.freeImg(s.img);
        if (s.wall) this.freeGfx(s.wall.g);
        return false;
      }
      return true;
    });
    let respawn = 0;
    this.particles = this.particles.filter((p) => {
      if (p.life <= 0) {
        this.freeImg(p.img);
        if (p.screen) respawn++;
        return false;
      }
      return true;
    });
    for (let i = 0; i < respawn; i++) this.spawnAmbient(false);
  }

  // ── Collisions ─────────────────────────────────────────────────────────
  /** Swept collision over [prevZ, dist] so fast frames can't tunnel through thin obstacles or pickups. */
  private collide(prevZ: number) {
    const pz = this.dist;
    const zLo = Math.min(prevZ, pz);
    const sliding = this.slideT >= 0 && this.jumpT < 0;
    const height = sliding ? PLAYER_SLIDE_H : PLAYER_H;
    for (const o of this.obstacles) {
      if (o.dead) continue;
      const z0 = o.z,
        z1 = o.z + o.gen.len;
      if (!o.passed && z1 < pz - PLAYER_HALF_D) {
        o.passed = true;
        this.dodges++;
      }
      if (z1 < zLo - PLAYER_HALF_D || z0 > pz + PLAYER_HALF_D) continue;
      const halfW = o.art.w / 2 - 0.12;
      if (Math.abs(this.px - o.x) > PLAYER_HALF_W + halfW) continue;
      // vertical test
      let hit: boolean;
      if (o.gen.kind === "overhead") {
        hit = this.py + height > o.art.collideH && this.py < (o.art.top ?? 3);
      } else {
        hit = this.py < o.art.collideH - 0.05;
      }
      if (!hit || this.invuln > 0) continue;

      // side impact: the obstacle was already level with us and we steered into it
      const sideHit = this.laneT < 1 && z0 < pz - PLAYER_HALF_D * 0.5 && Math.abs(laneX(this.lane) - o.x) < 0.1;
      if (sideHit) {
        this.stumble();
        return;
      }
      if (this.shield) {
        this.shield = false;
        delete this.active.shield;
        this.invuln = 1;
        o.dead = true;
        this.burst(o.x, 1, o.z, 0x59f3ff, 30, "fx:star", 9);
        this.shake = 0.35;
        audio.play("shield");
        this.cb.onEvent?.({ type: "shieldBreak" });
        return;
      }
      this.crash(o);
      return;
    }

    // coins
    const magnet = !!this.active.magnet;
    const centerY = this.py + (sliding ? 0.4 : 0.9);
    for (const c of this.coins) {
      if (c.dead) continue;
      if (magnet && !c.pulled && c.z - pz < 16 && c.z - pz > -1) c.pulled = true;
      if (c.pulled) {
        const k = 0.24;
        c.x += (this.px - c.x) * k * 1.6;
        c.y += (centerY - c.y) * k * 1.6;
        c.z += (pz + 0.4 - c.z) * k * 1.2;
      }
      if (c.z > zLo - 0.9 && c.z < pz + 0.9 && Math.abs(c.x - this.px) < 0.95 && Math.abs(c.y - centerY) < 1.25) {
        c.dead = true;
        const n = this.active.coinboost ? 2 : 1;
        this.coinCount += n;
        this.score += COIN_SCORE * n;
        audio.play("coin");
        this.burst(c.x, c.y, c.z, hex(this.kit.city.coin.glow), 6, "fx:star", 3);
      }
    }
    for (const p of this.pus) {
      if (p.dead) continue;
      if (p.z > zLo - 1 && p.z < pz + 1 && Math.abs(p.x - this.px) < 1.0 && this.py < 2.4) {
        p.dead = true;
        this.activate(p.kind);
      }
    }
  }

  private activate(kind: PowerUpKind) {
    this.powerupsUsed++;
    this.active[kind] = POWERUP_DURATION[kind];
    if (kind === "shield") this.shield = true;
    audio.play("powerup");
    this.burst(this.px, 1.2, this.dist, hex(POWERUP_COLORS[kind]), 26, "fx:dot", 8);
    this.flash.setFillStyle(hex(POWERUP_COLORS[kind]), 0.25);
    this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 400 });
    this.cb.onEvent?.({ type: "powerup", kind });
  }

  private stumble() {
    const now = this.elapsed;
    // bounce back to the lane we came from
    this.lane = this.laneFrom;
    this.laneStartX = this.px;
    this.laneT = 0;
    this.shake = 0.3;
    this.stumbleT = 0.4;
    audio.play("stumble");
    this.cb.onEvent?.({ type: "stumble" });
    if (now - this.stumbleAt < 5000 && !this.shield) {
      this.crash(null);
      return;
    }
    if (this.shield) {
      this.shield = false;
      delete this.active.shield;
    }
    this.stumbleAt = now;
    this.invuln = 0.4;
  }

  private crash(o: Obs | null) {
    this.phase = "crash";
    this.crashT = 0;
    this.shake = 0.8;
    audio.play("crash");
    this.flash.setFillStyle(0xffffff, 0.75);
    this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 500 });
    this.burst(this.px, 1, this.dist + 0.5, hex(this.cfg.look.glow), 40, "fx:dot", 10);
    this.burst(this.px, 1, this.dist + 0.5, 0xffffff, 20, "fx:star", 8);
    if (o) o.img.setTint(0xffd0d0);
  }

  // ── Effects ────────────────────────────────────────────────────────────
  private particle(tex: string, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, opts: { grow?: number; gravity?: number; add?: boolean; screen?: boolean } = {}) {
    if (this.particles.length > 260) return;
    const img = this.getImg(tex);
    img.setOrigin(0.5, 0.5).setTint(color);
    if (opts.add !== false) img.setBlendMode(Phaser.BlendModes.ADD);
    this.particles.push({ img, x, y, z, vx, vy, vz, life, max: life, size, grow: opts.grow ?? 0, gravity: opts.gravity ?? 0, screen: !!opts.screen });
  }

  private burst(x: number, y: number, z: number, color: number, n: number, tex: string, spd: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      this.particle(tex, x, y, z, Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd + 2, Math.sin(a) * Math.cos(b) * spd + this.speed * 0.6, 0.45 + Math.random() * 0.4, 0.25 + Math.random() * 0.25, color, { gravity: 9 });
    }
  }

  private trailFx(dt: number) {
    const item = getItem(this.cfg.trail);
    if (!item || !item.color) return;
    this.trailTimer -= dt;
    if (this.trailTimer > 0) return;
    this.trailTimer = 0.025;
    const c1 = hex(item.color),
      c2 = hex(item.color2 ?? item.color);
    const y = this.py + (this.slideT >= 0 ? 0.4 : 0.95);
    if (this.cfg.trail === "trail_matrix") {
      this.particle("fx:bit", this.px + (Math.random() - 0.5) * 0.7, y + Math.random() * 0.6, this.dist - 0.2, 0, -0.5, 0, 0.6, 0.12, Math.random() < 0.5 ? c1 : c2, { add: true });
      return;
    }
    if (this.cfg.trail === "trail_rainbow") {
      const hue = (this.elapsed / 600) % 1;
      const col = Phaser.Display.Color.HSVToRGB(hue, 0.8, 1) as Phaser.Types.Display.ColorObject;
      this.particle("fx:dot", this.px, y, this.dist - 0.3, 0, 0, 0, 0.55, 0.45, Phaser.Display.Color.GetColor(col.r, col.g, col.b), { grow: -0.4 });
      return;
    }
    const tex = this.cfg.trail === "trail_gold" ? "fx:star" : "fx:dot";
    this.particle(tex, this.px + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, this.dist - 0.3, 0, this.cfg.trail === "trail_purple" ? 1.2 : 0, 0, 0.5, 0.42, Math.random() < 0.5 ? c1 : c2, { grow: -0.5 });
  }

  private jumpFx() {
    const fx = this.cfg.jumpfx;
    const item = getItem(fx);
    const col = item?.color ? hex(item.color) : 0xffffff;
    // dust always
    for (let i = 0; i < 6; i++) this.particle("fx:dot", this.px + (Math.random() - 0.5), 0.1, this.dist, (Math.random() - 0.5) * 3, 1, -2, 0.35, 0.3, 0xbbbbcc, { add: false, grow: 1 });
    if (fx === "jfx_shockwave") this.particle("fx:ring", this.px, 0.1, this.dist, 0, 0, 0, 0.45, 0.4, col, { grow: 5 });
    if (fx === "jfx_starburst") this.burst(this.px, 0.3, this.dist, col, 18, "fx:star", 6);
    if (fx === "jfx_lightning") {
      for (let i = 0; i < 14; i++) this.particle("fx:bit", this.px + (Math.random() - 0.5) * 1.6, Math.random() * 1.8, this.dist, 0, 0, 0, 0.18, 0.3, col);
      this.flash.setFillStyle(col, 0.2);
      this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 200 });
    }
  }

  private landFx() {
    for (let i = 0; i < 5; i++) this.particle("fx:dot", this.px + (Math.random() - 0.5), 0.05, this.dist, (Math.random() - 0.5) * 3, 0.6, -1, 0.3, 0.25, 0xaaaabb, { add: false, grow: 1 });
  }

  private slideFx(_dt: number) {
    const fx = this.cfg.slidefx;
    if (Math.random() < 0.5) this.particle("fx:dot", this.px + (Math.random() - 0.5) * 0.5, 0.05, this.dist, (Math.random() - 0.5), 0.5, -1, 0.3, 0.22, 0x999aaa, { add: false, grow: 0.8 });
    const item = getItem(fx);
    if (!item?.color) return;
    const col = hex(item.color);
    if (fx === "sfx_sparks") for (let i = 0; i < 2; i++) this.particle("fx:dot", this.px + (Math.random() - 0.5) * 0.6, 0.05, this.dist - 0.2, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, -3, 0.35, 0.12, col, { gravity: 14 });
    if (fx === "sfx_neon") this.particle("fx:streak", this.px, 0.05, this.dist - 0.4, 0, 0, 0, 0.5, 0.5, col);
    if (fx === "sfx_ice") this.particle("fx:dot", this.px + (Math.random() - 0.5) * 1.2, 0.2 + Math.random() * 0.5, this.dist, (Math.random() - 0.5) * 2, 0.3, 0, 0.7, 0.4, col, { grow: 0.8 });
  }

  private warpStreak() {
    const a = Math.random() * Math.PI * 2;
    const col = hex(this.kit.city.palette.neon[Math.floor(Math.random() * this.kit.city.palette.neon.length)]);
    const img = this.getImg("fx:streak");
    img.setOrigin(0, 0.5).setTint(col).setBlendMode(Phaser.BlendModes.ADD).setRotation(a);
    const r0 = 30 + Math.random() * 60;
    img.setPosition(this.W / 2 + Math.cos(a) * r0, this.horizon + Math.sin(a) * r0).setDepth(25000).setScale(0.6, 0.6);
    this.tweens.add({
      targets: img,
      x: this.W / 2 + Math.cos(a) * this.W,
      y: this.horizon + Math.sin(a) * this.W,
      scaleX: 4,
      alpha: 0,
      duration: 500,
      onComplete: () => this.freeImg(img),
    });
  }

  private spawnAmbient(initial: boolean) {
    const kind = this.kit.ambience;
    const pal = this.kit.city.palette;
    const W = this.W || 400,
      H = this.H || 800;
    const x = Math.random() * W;
    const y = initial ? Math.random() * H : -20;
    let tex = "fx:dot",
      vx = 0,
      vy = 0,
      life = 6,
      size = 3,
      color = 0xffffff,
      alpha = 0.5;
    switch (kind) {
      case "rain":
        tex = "fx:rain";
        vx = -60;
        vy = 900;
        life = 2;
        size = 1;
        color = 0xc9b8ff;
        alpha = 0.35;
        break;
      case "mist":
        tex = "fx:dot";
        vx = 20;
        vy = 8;
        life = 8;
        size = 18;
        color = 0xbcd2ff;
        alpha = 0.05;
        break;
      case "dust":
        vx = 120;
        vy = 20;
        size = 2;
        color = 0xffd9a0;
        alpha = 0.35;
        break;
      case "embers":
        vx = 10;
        vy = -40;
        size = 2.5;
        color = 0xffb02e;
        alpha = 0.6;
        break;
      case "sparkle":
        vy = 15;
        size = 2;
        color = 0xfff6d8;
        alpha = 0.6;
        break;
      case "pixels":
        tex = "fx:bit";
        vy = 60;
        size = 0.4;
        color = hex(pal.neon[Math.floor(Math.random() * 4)]);
        alpha = 0.45;
        break;
      case "fireflies":
        vx = (Math.random() - 0.5) * 30;
        vy = (Math.random() - 0.5) * 30;
        size = 2.5;
        color = 0xc6ff9a;
        alpha = 0.7;
        break;
      case "steam":
        vx = 10;
        vy = -25;
        size = 14;
        color = 0xdfe6f0;
        alpha = 0.05;
        break;
    }
    const img = this.getImg(tex);
    img.setOrigin(0.5, 0.5).setTint(color).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(20000);
    const yStart = kind === "embers" || kind === "steam" ? (initial ? Math.random() * H : H + 20) : y;
    this.particles.push({ img, x, y: yStart, z: 0, vx, vy, vz: 0, life: initial ? Math.random() * life : life, max: life, size, grow: 0, gravity: 0, screen: true });
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  private quad(g: Phaser.GameObjects.Graphics, color: number, alpha: number, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) {
    g.fillStyle(color, alpha);
    g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
    g.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
  }

  private render3D(realDt: number) {
    const camZ = this.camZ();
    const pal = this.kit.city.palette;
    const fogC = hex(pal.fog);
    // camera follows the runner sideways with a little lag
    this.camX += (this.px * 0.55 - this.camX) * Math.min(1, realDt * 6);
    let sx = 0,
      sy = 0;
    if (this.shake > 0) {
      this.shake -= realDt;
      const m = this.shake * 18;
      sx = (Math.random() - 0.5) * m;
      sy = (Math.random() - 0.5) * m;
    }
    this.cameras.main.setScroll(sx, sy);

    // backgrounds parallax
    this.far.tilePositionX = (this.bgScroll * 0.4 + this.camX * 6) / this.far.tileScaleX;
    this.near.tilePositionX = (this.bgScroll * 0.8 + this.camX * 14) / this.near.tileScaleX;

    // ── road ──
    const g = this.road;
    g.clear();
    g.fillStyle(hex(pal.ground), 1);
    g.fillRect(-20, this.horizon, this.W + 40, this.H - this.horizon + 20);
    const zStart = Math.floor((camZ + NEAR) / SEG) * SEG;
    const roadC = hex(pal.road),
      roadAlt = hex(pal.roadAlt),
      rA = hex(pal.rumbleA),
      rB = hex(pal.rumbleB),
      line = hex(pal.laneLine),
      walk = hex(pal.sidewalk),
      ground = hex(pal.ground);
    const edges = [-ROAD_HALF - 6, -ROAD_HALF - 0.35, -ROAD_HALF, ROAD_HALF, ROAD_HALF + 0.35, ROAD_HALF + 6];
    // draw far → near so nearer segments overwrite
    const segs: number[] = [];
    for (let z = zStart; z < camZ + DRAW_DIST; z += SEG) segs.push(z);
    for (let i = segs.length - 1; i >= 0; i--) {
      const z1 = Math.max(segs[i], camZ + NEAR);
      const z2 = segs[i] + SEG;
      const dz = z1 - camZ;
      const f = this.fogT(dz);
      const idx = mod(Math.floor(segs[i] / SEG), 1 << 20);
      const P = (x: number, z: number) => this.proj(x, 0, z)!;
      const a = edges.map((x) => P(x, z1));
      const b = edges.map((x) => P(x, z2));
      // sidewalks
      this.quad(g, mix(idx % 2 ? walk : mix(walk, ground, 0.3), fogC, f), 1, a[0], b[0], b[1], a[1]);
      this.quad(g, mix(idx % 2 ? walk : mix(walk, ground, 0.3), fogC, f), 1, a[4], b[4], b[5], a[5]);
      // rumble strips
      const rc = mix(idx % 2 ? rA : rB, fogC, f);
      this.quad(g, rc, 1, a[1], b[1], b[2], a[2]);
      this.quad(g, rc, 1, a[3], b[3], b[4], a[4]);
      // asphalt
      this.quad(g, mix(idx % 2 ? roadC : roadAlt, fogC, f), 1, a[2], b[2], b[3], a[3]);
      // lane dashes (every other segment)
      if (idx % 2 === 0) {
        for (const lx of [-LANE_W / 2, LANE_W / 2]) {
          const l1 = P(lx - 0.07, z1),
            l2 = P(lx + 0.07, z1),
            l3 = P(lx + 0.07, z2),
            l4 = P(lx - 0.07, z2);
          this.quad(g, mix(line, fogC, f), 0.9, l1, l4, l3, l2);
        }
      }
      // neon reflection streaks on wet roads
      if (this.kit.ambience === "rain" && idx % 3 === 0 && dz < 90) {
        const c = hex(pal.neon[idx % pal.neon.length]);
        const x0 = ((idx * 37) % 5) - 2.5;
        const r1 = P(x0 - 0.25, z1),
          r2 = P(x0 + 0.25, z1),
          r3 = P(x0 + 0.25, z1 + SEG * 0.8),
          r4 = P(x0 - 0.25, z1 + SEG * 0.8);
        this.quad(g, c, 0.12 * (1 - f), r1, r4, r3, r2);
      }
    }

    // ── scenery (buildings + props) ──
    for (const s of this.scenery) {
      const dz = s.z - camZ;
      if (s.wall) this.drawWall(s, camZ, fogC);
      const p = this.proj(s.x, 0, s.z);
      if (!p || dz > DRAW_DIST + 10) {
        s.img.setVisible(false);
        continue;
      }
      const f = this.fogT(dz);
      s.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setDisplaySize(s.w * p.s, s.h * p.s)
        .setDepth(1000 - dz * 4)
        .setTint(mix(0xffffff, fogC, f * 0.85))
        .setAlpha(1 - smooth(DRAW_DIST - 15, DRAW_DIST + 10, dz));
    }

    // ── obstacles ──
    for (const o of this.obstacles) {
      const dz = o.z - camZ;
      const p = this.proj(o.x, 0, o.z);
      const f = this.fogT(dz);
      if (o.g) this.drawBox(o, camZ, fogC);
      if (!p || dz > DRAW_DIST) {
        o.img.setVisible(false);
        continue;
      }
      o.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setDisplaySize(o.art.w * p.s, o.art.h * p.s)
        .setDepth(this.depthFor(dz))
        .setAlpha(1 - smooth(DRAW_DIST - 20, DRAW_DIST, dz));
      if (!o.dead && o.img.tintTopLeft !== 0xffd0d0) o.img.setTint(mix(0xffffff, fogC, f * 0.8));
    }

    // ── city portal ──
    if (this.portal) {
      const dz = this.portal.z - camZ;
      const p = this.proj(0, 0, this.portal.z);
      if (!p || dz > DRAW_DIST + 30) this.portal.img.setVisible(false);
      else
        this.portal.img
          .setVisible(true)
          .setPosition(p.x, p.y)
          .setDisplaySize(PORTAL_W * p.s, PORTAL_H * p.s)
          .setDepth(this.depthFor(dz) - 5)
          .setAlpha(1 - smooth(DRAW_DIST - 10, DRAW_DIST + 30, dz));
    }

    // ── coins / power-ups ──
    const spin = this.time.now / 1000;
    for (const c of this.coins) {
      const dz = c.z - camZ;
      const p = this.proj(c.x, c.y + Math.sin(spin * 3 + c.z) * 0.08, c.z);
      if (!p || dz > DRAW_DIST) {
        c.img.setVisible(false);
        continue;
      }
      const sz = 0.75 * p.s;
      c.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setDisplaySize(sz * Math.max(0.15, Math.abs(Math.cos(spin * 4 + c.z * 0.3))), sz)
        .setDepth(this.depthFor(dz) + 1)
        .setAlpha(1 - smooth(DRAW_DIST - 30, DRAW_DIST, dz));
    }
    for (const u of this.pus) {
      const dz = u.z - camZ;
      const p = this.proj(u.x, 1.1 + Math.sin(spin * 2.5) * 0.15, u.z);
      if (!p || dz > DRAW_DIST) {
        u.img.setVisible(false);
        continue;
      }
      u.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setDisplaySize(1.2 * p.s, 1.2 * p.s)
        .setDepth(this.depthFor(dz) + 1)
        .setRotation(Math.sin(spin * 2) * 0.15);
    }

    // ── particles ──
    for (const pt of this.particles) {
      if (pt.screen) {
        const dpr = this.W / Math.max(1, this.game.canvas.clientWidth || this.W);
        pt.img.setPosition(pt.x, pt.y);
        if (this.kit.ambience === "rain") pt.img.setDisplaySize(1.5 * dpr, 26 * dpr);
        else if (pt.img.texture.key === "fx:bit") pt.img.setDisplaySize(4 * dpr, 7 * dpr);
        else pt.img.setDisplaySize(pt.size * 2.4 * dpr, pt.size * 2.4 * dpr);
        if (pt.y > this.H + 40 || pt.x > this.W + 60 || pt.y < -60) pt.life = 0;
        continue;
      }
      const dz = pt.z - camZ;
      const p = this.proj(pt.x, pt.y, pt.z);
      if (!p) {
        pt.life = 0;
        continue;
      }
      const a = Math.max(0, pt.life / pt.max);
      pt.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setDisplaySize(Math.max(1, pt.size * p.s), Math.max(1, pt.size * p.s))
        .setAlpha(a)
        .setDepth(this.depthFor(dz) + 2);
    }

    // ── player ──
    this.drawPlayer();
  }

  private drawWall(s: Scenery, camZ: number, fogC: number) {
    const w = s.wall!;
    const g = w.g;
    g.clear();
    const z0 = Math.max(s.z, camZ + NEAR);
    const z1 = s.z + w.depth;
    if (z1 <= z0 || s.z - camZ > DRAW_DIST) {
      g.setVisible(false);
      return;
    }
    g.setVisible(true);
    const xi = s.x - s.side * (s.w / 2); // inner (road-facing) edge
    const h = s.h;
    const P = (y: number, z: number) => this.proj(xi, y, z)!;
    const dz = z0 - camZ;
    const f = this.fogT(dz);
    const detail = dz < 110;
    const F = (c: number) => mix(c, fogC, f);
    const band = (y0: number, y1: number, za: number, zb: number, color: number, alpha: number) => this.quad(g, F(color), alpha, P(y0, za), P(y1, za), P(y1, zb), P(y0, zb));
    const L = z1 - s.z;
    const at = (t: number) => Math.max(z0, s.z + L * t);
    const seed = w.seed;
    band(0, h, z0, z1, w.color, 1);
    const floorH = w.style === "stone" || w.style === "brick" || w.style === "paint" ? 3.6 : 3.3;
    const floors = Math.min(w.style === "glass" || w.style === "garden" ? 16 : 9, Math.floor((h - 4.5) / floorH));

    switch (w.style) {
      case "neon": {
        for (let i = 0; i < floors; i++) {
          const y = 4.6 + i * floorH;
          if (detail) for (let k = 0; k < 3; k++) if ((i * 5 + k * 3 + seed) % 4) band(y, y + 1.4, at((k + 0.12) / 3), at((k + 0.88) / 3), w.lit[(i + k + seed) % w.lit.length], 0.6);
          if ((i + seed) % 3 === 0) band(y + 2.2, y + 2.35, z0, z1, w.neon, 0.95);
        }
        // vertical neon sign strip near the front
        band(5, Math.min(h - 2, 16), at(0.04), at(0.1), w.trim, 0.9);
        break;
      }
      case "led": {
        for (let i = 0; i < floors; i++) {
          const y = 4.6 + i * floorH;
          if (detail && (i + seed) % 2) band(y, y + 1.2, at(0.1), at(0.9), w.lit[(i + seed) % w.lit.length], 0.35);
        }
        // giant animated LED screen
        const hue = ((this.time.now / 4000 + seed / 97) % 1 + 1) % 1;
        const c1 = Phaser.Display.Color.HSVToRGB(hue, 0.75, 1) as Phaser.Types.Display.ColorObject;
        const c2 = Phaser.Display.Color.HSVToRGB((hue + 0.3) % 1, 0.8, 0.9) as Phaser.Types.Display.ColorObject;
        const yb = Math.min(h * 0.35, 12),
          yt = Math.min(h - 2, yb + Math.max(8, h * 0.35));
        band(yb, (yb + yt) / 2, at(0.15), at(0.85), Phaser.Display.Color.GetColor(c1.r, c1.g, c1.b), 0.9);
        band((yb + yt) / 2, yt, at(0.15), at(0.85), Phaser.Display.Color.GetColor(c2.r, c2.g, c2.b), 0.9);
        band(yt, yt + 0.25, at(0.15), at(0.85), w.trim, 1);
        break;
      }
      case "brick":
      case "paint": {
        const cols = Math.max(2, Math.round(L / 3.2));
        for (let i = 0; i < floors; i++) {
          const y = 5 + i * floorH;
          if (detail) {
            for (let k = 0; k < cols; k++) {
              const lit = (i * 3 + k * 7 + seed) % 5 < 3;
              band(y, y + 1.9, at((k + 0.25) / cols), at((k + 0.7) / cols), lit ? w.lit[(i + k) % w.lit.length] : 0x14151c, lit ? 0.85 : 1);
            }
          } else band(y, y + 1.9, z0, z1, w.lit[i % w.lit.length], 0.25);
          if (w.style === "paint") band(y - 0.35, y - 0.15, z0, z1, w.trim, 0.8); // balcony rail
        }
        band(h - 0.8, h, z0, z1, w.trim, 0.9); // cornice
        if (w.style === "paint" && seed % 2 === 0 && h > 10) {
          // painted billboard
          band(h * 0.45, h * 0.45 + 4, at(0.15), at(0.85), w.neon, 0.95);
          band(h * 0.45 + 1.4, h * 0.45 + 2.6, at(0.4), at(0.6), 0xffffff, 0.95);
        }
        if (this.kit.city.id === "newyork" && detail) {
          // fire escape zig-zags
          for (let i = 0; i < floors; i += 2) band(5 + i * floorH - 0.2, 5 + i * floorH, at(0.35), at(0.65), 0x111111, 1);
        }
        break;
      }
      case "stone": {
        const cols = Math.max(2, Math.round(L / 3));
        for (let i = 0; i < Math.min(floors, 5); i++) {
          const y = 5 + i * floorH;
          if (detail)
            for (let k = 0; k < cols; k++) {
              const lit = (i * 3 + k * 5 + seed) % 5 < 3;
              band(y, y + 2.3, at((k + 0.3) / cols), at((k + 0.7) / cols), lit ? w.lit[(i + k) % w.lit.length] : 0x1d1b24, 1);
            }
          band(y - 0.25, y, z0, z1, 0x151518, 0.9); // wrought-iron balcony line
        }
        const roofY = Math.min(h, 5 + 5 * floorH);
        band(roofY, roofY + 3.2, z0, z1, w.trim, 1); // mansard roof
        // café awning at street level
        band(3.2, 3.9, z0, z1, (seed % 2 ? 0xa3192d : 0x1f5a3a), 1);
        band(0.3, 3.2, z0, z1, 0xffcf8a, 0.3);
        break;
      }
      case "glass":
      case "garden": {
        for (let i = 0; i < floors; i++) {
          const y = 4.6 + i * floorH;
          const lit = (i + seed) % 3 !== 0;
          band(y, y + 2.2, z0, z1, lit ? w.lit[(i + seed) % w.lit.length] : 0x0b1a22, lit ? 0.32 : 0.8);
          if (w.style === "garden" && i % 3 === 1) band(y + 2.2, y + 3.1, z0, z1, w.trim, 1);
        }
        if (w.style === "glass" && detail) for (let k = 1; k < 6; k++) band(4.5, h, at(k / 6 - 0.006), at(k / 6 + 0.006), w.trim, 0.55);
        band(h - 0.4, h, z0, z1, w.trim, 1);
        break;
      }
    }
    // storefront glow + street-level neon rim (every city)
    band(0.3, 3.4, z0, z1, w.neon, 0.28);
    band(3.6, 3.85, z0, z1, w.neon, 0.9);
    g.setDepth(1000 - (z1 - camZ) * 4);
  }

  private drawBox(o: Obs, camZ: number, fogC: number) {
    const g = o.g!;
    g.clear();
    const z0 = Math.max(o.z, camZ + NEAR);
    const z1 = o.z + o.gen.len;
    if (z1 <= z0 || o.z - camZ > DRAW_DIST) return;
    const { w, h } = o.art;
    const x0 = o.x - w / 2,
      x1 = o.x + w / 2;
    const f = this.fogT(z0 - camZ);
    const P = (x: number, y: number, z: number) => this.proj(x, y, z)!;
    // side facing the camera
    const xs = o.x < this.camX ? x1 : x0;
    const side = mix(hex(o.art.sideColor), fogC, f);
    this.quad(g, side, 1, P(xs, 0.1, z0), P(xs, h * 0.92, z0), P(xs, h * 0.92, z1), P(xs, 0.1, z1));
    if (o.art.stripe) {
      const sc = mix(hex(o.art.stripe), fogC, f);
      this.quad(g, sc, 0.9, P(xs, h * 0.5, z0), P(xs, h * 0.54, z0), P(xs, h * 0.54, z1), P(xs, h * 0.5, z1));
      // window band
      this.quad(g, mix(0x0b1220, fogC, f), 0.95, P(xs, h * 0.6, z0), P(xs, h * 0.82, z0), P(xs, h * 0.82, z1), P(xs, h * 0.6, z1));
    }
    // roof
    const roof = mix(hex(o.art.roofColor), fogC, f);
    this.quad(g, roof, 1, P(x0, h * 0.92, z0), P(x1, h * 0.92, z0), P(x1, h * 0.92, z1), P(x0, h * 0.92, z1));
    g.setDepth(this.depthFor(z1 - camZ) - 1);
  }

  private drawPlayer() {
    const pz = this.dist;
    const camZ = this.camZ();
    const dz = pz - camZ;
    const feet = this.proj(this.px, this.py, pz);
    const ground = this.proj(this.px, 0, pz);
    if (!feet || !ground) return;
    // pose selection
    let frame: string;
    let angle = 0;
    let scaleY = 1;
    if (this.phase === "crash" || this.phase === "ended") {
      frame = "crash";
      angle = Math.min(1, this.crashT) * 80;
    } else if (this.jumpT >= 0 && this.py > 0.05) frame = "jump";
    else if (this.slideT >= 0) frame = "slide";
    else frame = `run${Math.floor(this.runPhase * 8) % 8}`;

    // intro emote
    if (this.phase === "intro") {
      const e = this.cfg.emote;
      const t = this.introT / 1.5;
      if (e === "emote_spin") scaleY = 1;
      if (e === "emote_flip") {
        frame = t < 0.7 ? "jump" : frame;
        angle = t < 0.7 ? -t * 514 : 0;
      }
      if (e === "emote_pose") scaleY = 1 + Math.sin(t * Math.PI * 3) * 0.06;
    }
    const lean = this.laneT < 1 ? (laneX(this.lane) - this.laneStartX > 0 ? 8 : -8) * (1 - this.laneT) : 0;
    if (this.c3) {
      this.drawPlayer3D(feet, ground, dz, lean);
      return;
    }
    const h = PLAYER_H * 1.2 * feet.s;
    this.player
      .setTexture(this.runnerKey(frame))
      .setOrigin(0.5, 472 / 480)
      .setPosition(feet.x, feet.y)
      .setDisplaySize((h * 320) / 480, h * scaleY)
      .setAngle(angle + lean)
      .setDepth(this.depthFor(dz) + 3);
    if (this.phase === "intro" && this.cfg.emote === "emote_spin") {
      const t = this.introT / 1.5;
      this.player.setScale(this.player.scaleX * Math.cos(t * Math.PI * 4), this.player.scaleY);
    }
    if (this.invuln > 0 && this.phase === "run") this.player.setAlpha(Math.sin(this.time.now / 40) > 0 ? 0.4 : 1);
    else this.player.setAlpha(1);
    const shadowScale = 1 / (1 + this.py * 0.5);
    this.shadow
      .setPosition(ground.x, ground.y)
      .setDisplaySize(1.3 * ground.s * shadowScale, 0.45 * ground.s * shadowScale)
      .setDepth(this.depthFor(dz) - 2);

    this.drawAura(dz);
  }

  private drawAura(dz: number) {
    const pz = this.dist;
    // shield / magnet aura
    const auraKind = this.shield ? "shield" : this.active.magnet ? "magnet" : this.active.superjump ? "superjump" : null;
    if (auraKind) {
      const mid = this.proj(this.px, this.py + (this.slideT >= 0 ? 0.5 : 1.0), pz)!;
      const pulse = 1 + Math.sin(this.time.now / 120) * 0.06;
      this.aura
        .setVisible(true)
        .setTint(hex(POWERUP_COLORS[auraKind]))
        .setPosition(mid.x, mid.y)
        .setDisplaySize(2.2 * mid.s * pulse, 2.4 * mid.s * pulse)
        .setAlpha(0.75)
        .setDepth(this.depthFor(dz) + 4);
    } else this.aura.setVisible(false);
  }

  /** Animate + render the 3D runner and composite it as a sprite aligned with the game camera. */
  private drawPlayer3D(feet: { x: number; y: number; s: number }, ground: { x: number; y: number; s: number }, dz: number, lean: number) {
    const c3 = this.c3!;
    const pz = this.dist;
    const dt = this.frameDt;
    if (this.stumbleT > 0) this.stumbleT -= dt;
    // choose the animation
    let want: Anim;
    let ts = 1;
    if (this.phase === "crash" || this.phase === "ended") want = "crash";
    else if (this.phase === "intro" && this.cfg.emote === "emote_pose" && this.introT < 0.9) want = "dance";
    else if (this.jumpT >= 0 && this.py > 0.05) want = "jump";
    else if (this.slideT >= 0) {
      want = "roll";
      ts = c3.clipDuration("roll") / SLIDE_TIME;
    } else if (this.stumbleT > 0) want = "stumble";
    else {
      want = "run";
      ts = Phaser.Math.Clamp(this.speed / 21, 0.55, 1.55);
    }
    if (want !== this.c3Anim) {
      c3.play(want, want === "jump" ? 0.08 : want === "crash" ? 0.05 : 0.14, ts);
      this.c3Anim = want;
    } else if (want === "run") c3.play("run", 0, ts);
    // intro emotes
    let spin = 0,
      pitch = 0;
    if (this.phase === "intro") {
      const t = Math.min(1, this.introT / 1.5);
      if (this.cfg.emote === "emote_spin") spin = t * Math.PI * 2;
      if (this.cfg.emote === "emote_flip" && t < 0.7) pitch = (t / 0.7) * Math.PI * 2;
    }
    c3.setPose({ lean: (-lean * Math.PI) / 180, yaw: (-lean * Math.PI) / 360, spin, pitch });
    // screen rectangle the texture covers (2.6 m wide window around the runner)
    const top = this.proj(this.px, this.py + TARGET_HEIGHT + 0.55, pz)!;
    const bottom = this.proj(this.px, this.py - 0.55, pz)!;
    const h = bottom.y - top.y;
    const w = (h * 320) / 384;
    const rect = { x: feet.x - w / 2, y: top.y, w, h };
    const curve = this.curveK * dz * dz;
    // On slow devices render the 3D runner every other frame (animation time still accumulates).
    this.c3Dt += dt;
    this.c3Skip = this.avgFrameMs > 24 ? !this.c3Skip : false;
    if (this.c3Skip) {
      this.player.setPosition(rect.x, rect.y).setDisplaySize(w, h).setDepth(this.depthFor(dz) + 3);
      return;
    }
    const animDt = this.c3Dt;
    this.c3Dt = 0;
    c3.render(animDt, {
      screenW: this.W,
      screenH: this.H,
      horizon: this.horizon,
      focal: this.focal,
      rect,
      camOffsetX: this.camX - this.px - curve,
      camHeight: this.camH,
      camBack: this.camBack,
      runnerY: this.py,
    });
    this.textures.get("runner3d").source[0].update();
    this.player
      .setTexture("runner3d")
      .setOrigin(0, 0)
      .setScale(1)
      .setAngle(0)
      .setPosition(rect.x, rect.y)
      .setDisplaySize(w, h)
      .setDepth(this.depthFor(dz) + 3)
      .setAlpha(this.invuln > 0 && this.phase === "run" ? (Math.sin(this.time.now / 40) > 0 ? 0.45 : 1) : 1);
    const shadowScale = 1 / (1 + this.py * 0.5);
    this.shadow
      .setPosition(ground.x, ground.y)
      .setDisplaySize(1.3 * ground.s * shadowScale, 0.45 * ground.s * shadowScale)
      .setDepth(this.depthFor(dz) - 2);
    this.drawAura(dz);
  }
}

interface TutorialDef {
  action: GameAction;
  text: string;
  obstacles: [number, "block" | "low" | "overhead"][];
  coinLane: number;
  prompted?: boolean;
}

const TUTORIAL_BASE: TutorialDef[] = [
  { action: "left", text: "Swipe LEFT to change lanes", obstacles: [[1, "block"], [2, "block"]], coinLane: 0 },
  { action: "right", text: "Swipe RIGHT to dodge", obstacles: [[0, "block"]], coinLane: 1 },
  { action: "jump", text: "Swipe UP to jump", obstacles: [[0, "low"], [1, "low"], [2, "low"]], coinLane: 1 },
  { action: "slide", text: "Swipe DOWN to slide", obstacles: [[0, "overhead"], [1, "overhead"], [2, "overhead"]], coinLane: 1 },
];
let TUTORIAL: TutorialDef[] = TUTORIAL_BASE.map((t) => ({ ...t }));
export function resetTutorial() {
  TUTORIAL = TUTORIAL_BASE.map((t) => ({ ...t }));
}

export { BLD_PX, PX_PER_M };
