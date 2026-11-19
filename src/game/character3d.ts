// Real-time 3D runner (SKEL). A rigged, realistically proportioned human (Quaternius Universal
// Animation Library mannequin, CC0) dressed in the Metawin outfit — chrome helmet, black visor with
// the glowing MW symbol, violet jacket, green vest, dark pants and boots — rendered with Three.js
// (PBR materials, environment reflections, neon rim lights) into an offscreen canvas that the Phaser
// scene uses as a live texture. The game's camera projection is reproduced exactly with an
// off-axis view so the 3D runner lines up with the 2.5D world.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { drawGlyph } from "@/lib/art/glyph";
import type { CharacterLook } from "@/lib/data/cosmetics";

export const MODEL_URL = "/models/skel.glb";
export const TARGET_HEIGHT = 2.35; // meters (heroic scale so the runner reads clearly on phones)

export type Anim = "run" | "jump" | "roll" | "crash" | "stumble" | "idle" | "dance";

const CLIP: Record<Anim, string> = {
  run: "Sprint_Loop",
  jump: "Jump_Loop",
  roll: "Roll",
  crash: "Death01",
  stumble: "Hit_Chest",
  idle: "Idle_Loop",
  dance: "Dance_Loop",
};
const ONE_SHOT: Anim[] = ["roll", "crash", "stumble"];

type Region = "jacket" | "jacketDark" | "vest" | "pants" | "boots" | "gloves" | "neck";

function regionForBone(name: string): Region {
  const n = name.replace(/^DEF-/, "");
  if (n.startsWith("head") || n.startsWith("neck")) return "neck";
  if (n.startsWith("hand") || n.startsWith("f_") || n.startsWith("thumb")) return "gloves";
  if (n.startsWith("foot") || n.startsWith("toe")) return "boots";
  if (n.startsWith("thigh") || n.startsWith("shin")) return "pants";
  if (n.startsWith("hips")) return "jacketDark";
  return "jacket";
}

function glyphTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  drawGlyph(ctx, 28, 28, 200, "#ffffff", color, 36);
  drawGlyph(ctx, 28, 28, 200, color);
  drawGlyph(ctx, 56, 56, 144, "rgba(255,255,255,0.85)");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface ViewParams {
  screenW: number;
  screenH: number;
  horizon: number;
  focal: number; // pixels
  rect: { x: number; y: number; w: number; h: number }; // screen rect the texture covers
  camOffsetX: number; // game camera x minus runner x (meters)
  camHeight: number; // game camera height above ground
  camBack: number; // game camera distance behind runner
  runnerY: number; // jump height
}

export class Character3D {
  private static loading: Promise<Character3D | null> | null = null;
  static instance: Character3D | null = null;

  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private root = new THREE.Group(); // positioned per frame (jump height, lean)
  private model!: THREE.Object3D;
  private mixer!: THREE.AnimationMixer;
  private actions = new Map<Anim, THREE.AnimationAction>();
  private current: Anim | null = null;
  private meshes: THREE.SkinnedMesh[] = [];
  private bodyMat!: THREE.MeshPhysicalMaterial;
  private jointMat!: THREE.MeshStandardMaterial;
  private regionOf: Region[][] = [];
  private helmet = new THREE.Group();
  private helmetExtras = new THREE.Group();
  private headBone!: THREE.Bone;
  private headCenter = new THREE.Vector3();
  private headRadius = 0.12;
  private backEmblem!: THREE.Mesh;
  private rimL = new THREE.DirectionalLight(0xff2bd6, 3);
  private rimR = new THREE.DirectionalLight(0x59f3ff, 3);
  private lookKey = "";

  static load(): Promise<Character3D | null> {
    if (!Character3D.loading) {
      Character3D.loading = (async () => {
        try {
          const c = new Character3D();
          await c.init();
          Character3D.instance = c;
          return c;
        } catch (e) {
          console.warn("3D runner unavailable, using 2D sprites:", e);
          return null;
        }
      })();
    }
    return Character3D.loading;
  }

  private constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 320;
    this.canvas.height = 384;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(this.root);
    // Lighting: soft sky fill, a key light from behind the camera, two neon rim lights from ahead.
    this.scene.add(new THREE.HemisphereLight(0xdfe0ff, 0x120a1c, 0.55));
    const key = new THREE.DirectionalLight(0xfff4ea, 2.2);
    key.position.set(1.5, 6, 6);
    this.scene.add(key);
    this.rimL.position.set(-4, 3, -5);
    this.rimR.position.set(4, 3, -5);
    this.scene.add(this.rimL, this.rimR);
  }

  private async init() {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    this.model = gltf.scene;
    // Face away from the camera (the game camera looks down -z in this scene).
    this.model.rotation.y = Math.PI;
    const box = new THREE.Box3().setFromObject(this.model);
    const s = TARGET_HEIGHT / (box.max.y - box.min.y);
    this.model.scale.setScalar(s);
    this.model.position.y = -box.min.y * s;
    this.root.add(this.model);
    this.model.updateMatrixWorld(true);

    this.bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.66, metalness: 0.02, sheen: 0.22, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xc58cff), envMapIntensity: 0.55 });
    this.jointMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.95, roughness: 0.28 });

    this.model.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
        const m = o as THREE.SkinnedMesh;
        m.frustumCulled = false;
        this.meshes.push(m);
      }
    });
    if (!this.meshes.length) throw new Error("model has no skinned mesh");
    this.classifyVertices();
    for (const m of this.meshes) {
      const mat = m.material as THREE.Material;
      m.material = /joint/i.test(mat.name) ? this.jointMat : this.bodyMat;
    }

    this.buildHelmet();
    this.buildBackEmblem();

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const [anim, name] of Object.entries(CLIP) as [Anim, string][]) {
      const clip = gltf.animations.find((a) => a.name === name);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (ONE_SHOT.includes(anim)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(anim, action);
    }
    this.play("idle", 0);
  }

  /** Assign each vertex to a body region from its dominant bone (bind pose), for outfit coloring. */
  private classifyVertices() {
    const bones = this.meshes[0].skeleton.bones;
    this.headBone = bones.find((b) => /DEF-head/.test(b.name)) ?? bones[0];
    const chest = new THREE.Vector3();
    (bones.find((b) => /spine\.?003/.test(b.name)) ?? this.headBone).getWorldPosition(chest);
    const v = new THREE.Vector3();
    const headPts: THREE.Vector3[] = [];
    for (const m of this.meshes) {
      const g = m.geometry;
      const pos = g.attributes.position;
      const si = g.attributes.skinIndex;
      const sw = g.attributes.skinWeight;
      const regions: Region[] = [];
      for (let i = 0; i < pos.count; i++) {
        let best = 0,
          bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          if (w > bw) {
            bw = w;
            best = si.getComponent(i, k);
          }
        }
        const bone = m.skeleton.bones[best]?.name ?? "";
        // skinned (rest-pose) position in world space — raw positions live in bind space
        m.applyBoneTransform(i, v.fromBufferAttribute(pos, i)).applyMatrix4(m.matrixWorld);
        let r = regionForBone(bone);
        // The model faces world -z: a narrow panel down the front of the chest is the green vest.
        if (r === "jacket" && /spine\.?00[23]/.test(bone) && v.z < chest.z && Math.abs(v.x - chest.x) < 0.07) r = "vest";
        if (/head/.test(bone)) headPts.push(v.clone());
        regions.push(r);
      }
      this.regionOf.push(regions);
      if (!g.attributes.color) g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    }
    this.headCenter.set(0, 0, 0);
    headPts.forEach((p) => this.headCenter.add(p));
    this.headCenter.divideScalar(Math.max(1, headPts.length));
    const radii = headPts.map((p) => Math.hypot(p.x - this.headCenter.x, p.z - this.headCenter.z));
    radii.sort((a, b) => a - b);
    this.headRadius = Math.max(0.08, radii[Math.floor(radii.length * 0.95)] ?? 0.1);
  }

  private buildHelmet() {
    const R = this.headRadius * 1.12;
    const g = this.helmet;
    g.clear();
    const shellMat = new THREE.MeshPhysicalMaterial({ color: 0xd9dde6, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), shellMat);
    shell.scale.set(0.9, 1.08, 1.02);
    shell.name = "shell";
    g.add(shell);
    // visor: glossy black glass wrapping the face (glTF front = +z in model space)
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x030408, metalness: 0.4, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
    const visor = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 48, 32, Math.PI / 2 - 0.95, 1.9, 0.62, 1.32), visorMat);
    visor.scale.copy(shell.scale);
    visor.name = "visor";
    g.add(visor);
    // the glowing MW symbol on the visor
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.9, R * 0.9), new THREE.MeshBasicMaterial({ map: glyphTexture("#38e8ff"), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    glyph.position.set(0, -R * 0.05, R * 1.06);
    glyph.name = "glyph";
    g.add(glyph);
    // ear discs
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.32, R * 0.32, R * 0.16, 32), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 1, roughness: 0.25 }));
      ear.rotation.z = Math.PI / 2;
      ear.position.set(sx * R * 0.9, -R * 0.08, 0);
      ear.name = "ear";
      g.add(ear);
    }
    // rear light bar + emblem: what the player actually sees while running
    const bar = new THREE.Mesh(new THREE.BoxGeometry(R * 1.0, R * 0.09, R * 0.06), new THREE.MeshBasicMaterial({ color: 0x38e8ff, toneMapped: false }));
    bar.position.set(0, -R * 0.42, -R * 0.97);
    bar.name = "bar";
    g.add(bar);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.55, R * 0.55), (glyph.material as THREE.Material).clone());
    rear.position.set(0, R * 0.12, -R * 1.1);
    rear.rotation.y = Math.PI;
    rear.name = "rearGlyph";
    g.add(rear);
    g.add(this.helmetExtras);
    g.position.copy(this.headCenter).add(new THREE.Vector3(0, R * 0.12, 0));
    g.rotation.y = Math.PI; // built facing +z; the runner faces world -z
    this.scene.attach(g); // world space first …
    this.headBone.attach(g); // … then follow the head bone keeping the world transform
  }

  private buildBackEmblem() {
    const spine = this.meshes[0].skeleton.bones.find((b) => /spine\.?003/.test(b.name)) ?? this.headBone;
    const p = new THREE.Vector3();
    spine.getWorldPosition(p);
    // the back surface sits behind the spine (glTF back = -z in model space → +z after our 180° turn)
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.getWorldQuaternion(new THREE.Quaternion()));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: glyphTexture("#38e8ff"), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    m.position.copy(p).addScaledVector(back, 0.17).add(new THREE.Vector3(0, -0.05, 0));
    m.lookAt(m.position.clone().add(back));
    m.name = "backEmblem";
    this.backEmblem = m;
    this.scene.attach(m);
    spine.attach(m);
  }

  /** Recolor the outfit / helmet for the equipped character + helmet style. */
  setLook(look: CharacterLook, helmetStyle: string) {
    const key = JSON.stringify(look) + helmetStyle;
    if (key === this.lookKey) return;
    this.lookKey = key;
    const col: Record<Region, THREE.Color> = {
      jacket: new THREE.Color(look.jacket[0]).multiplyScalar(0.72),
      jacketDark: new THREE.Color(look.jacket[1]).multiplyScalar(0.85),
      vest: new THREE.Color(look.vest),
      pants: new THREE.Color(look.pants),
      boots: new THREE.Color(look.boots),
      gloves: new THREE.Color("#121218"),
      neck: new THREE.Color("#15161d"),
    };
    this.meshes.forEach((m, mi) => {
      const c = m.geometry.attributes.color as THREE.BufferAttribute;
      this.regionOf[mi].forEach((r, i) => c.setXYZ(i, col[r].r, col[r].g, col[r].b));
      c.needsUpdate = true;
    });
    this.bodyMat.sheenColor = new THREE.Color(look.trim);
    this.jointMat.color = new THREE.Color(look.accent);
    const glow = new THREE.Color(look.glow);
    this.helmet.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial & THREE.MeshBasicMaterial;
      if (o.name === "shell") mat.color = new THREE.Color(look.helmet[1]);
      if (o.name === "visor") mat.color = new THREE.Color(look.visor);
      if (o.name === "ear") mat.color = new THREE.Color(look.helmet[2]);
      if (o.name === "bar") mat.color = glow;
      if (o.name === "glyph" || o.name === "rearGlyph") mat.map = glyphTexture(look.glow);
    });
    (this.backEmblem.material as THREE.MeshBasicMaterial).map = glyphTexture(look.glow);
    this.buildExtras(helmetStyle, look);
  }

  private buildExtras(style: string, look: CharacterLook) {
    const g = this.helmetExtras;
    g.clear();
    const R = this.headRadius * 1.12;
    const glowMat = (c: string) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    if (style === "helm_antenna") {
      for (const sx of [-1, 1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.03, R * 0.03, R * 0.9), new THREE.MeshStandardMaterial({ color: look.helmet[2], metalness: 1, roughness: 0.3 }));
        rod.position.set(sx * R * 0.55, R * 1.2, 0);
        rod.rotation.z = -sx * 0.35;
        const tip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 16, 12), glowMat("#59f3ff"));
        tip.position.set(sx * R * 0.72, R * 1.62, 0);
        g.add(rod, tip);
      }
    } else if (style === "helm_crest") {
      const crest = new THREE.Mesh(new THREE.BoxGeometry(R * 0.12, R * 0.45, R * 1.9), glowMat("#ff2bd6"));
      crest.position.set(0, R * 1.08, -R * 0.05);
      g.add(crest);
    } else if (style === "helm_horns") {
      for (const sx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(R * 0.16, R * 0.9, 20), new THREE.MeshStandardMaterial({ color: 0xe8ecf5, metalness: 1, roughness: 0.2 }));
        horn.position.set(sx * R * 0.7, R * 1.05, 0);
        horn.rotation.z = -sx * 0.6;
        g.add(horn);
      }
    } else if (style === "helm_halo") {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(R * 0.85, R * 0.07, 12, 48), glowMat("#ffe14d"));
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, R * 1.55, 0);
      g.add(halo);
    }
  }

  setRimColors(a: string, b: string) {
    this.rimL.color.set(a);
    this.rimR.color.set(b);
  }

  play(anim: Anim, fade = 0.12, timeScale = 1) {
    const next = this.actions.get(anim);
    if (!next) return;
    if (this.current === anim && !ONE_SHOT.includes(anim)) {
      next.timeScale = timeScale;
      return;
    }
    const prev = this.current ? this.actions.get(this.current) : null;
    next.reset();
    next.timeScale = timeScale;
    next.setEffectiveWeight(1);
    next.play();
    if (prev && prev !== next && fade > 0) prev.crossFadeTo(next, fade, false);
    else if (prev && prev !== next) prev.stop();
    this.current = anim;
  }

  get currentAnim() {
    return this.current;
  }

  clipDuration(anim: Anim) {
    return this.actions.get(anim)?.getClip().duration ?? 1;
  }

  setPose(opts: { lean?: number; yaw?: number; spin?: number; pitch?: number }) {
    this.root.rotation.set(opts.pitch ?? 0, (opts.yaw ?? 0) + (opts.spin ?? 0), opts.lean ?? 0);
  }

  /** Advance animation and render the runner exactly as the game camera would see it. */
  render(dt: number, v: ViewParams) {
    if (this.canvas.width !== 320 || this.canvas.height !== 384) this.renderer.setSize(320, 384, false);
    this.mixer.update(dt);
    this.root.position.set(0, v.runnerY, 0);
    // Off-axis camera: the game's principal point is (W/2, horizon), three's is the view centre.
    const fullH = 2 * Math.max(v.horizon, v.screenH - v.horizon);
    const cy = fullH / 2;
    this.camera.fov = (2 * Math.atan(cy / v.focal) * 180) / Math.PI;
    this.camera.aspect = v.screenW / fullH;
    this.camera.position.set(v.camOffsetX, v.camHeight, v.camBack);
    this.camera.rotation.set(0, 0, 0);
    this.camera.setViewOffset(v.screenW, fullH, v.rect.x, v.rect.y - v.horizon + cy, v.rect.w, v.rect.h);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  /** Static 3/4 front view used for UI portraits (shop, profile). */
  snapshot(look: CharacterLook, helmet: string, size = 256): HTMLCanvasElement {
    this.setLook(look, helmet);
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevAnim = this.current;
    this.play("idle", 0);
    this.mixer.update(0.4);
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, Math.PI + 0.35, 0); // turn to face the viewer
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    cam.position.set(0, TARGET_HEIGHT * 0.8, TARGET_HEIGHT * 1.45);
    cam.lookAt(0, TARGET_HEIGHT * 0.68, 0);
    this.renderer.setSize(size, size, false);
    this.renderer.render(this.scene, cam);
    const out = document.createElement("canvas");
    out.width = out.height = size;
    out.getContext("2d")!.drawImage(this.canvas, 0, 0, size, size, 0, 0, size, size);
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.root.rotation.set(0, 0, 0);
    if (prevAnim) this.play(prevAnim, 0);
    return out;
  }
}
