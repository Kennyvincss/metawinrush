// Procedural audio: a tiny step-sequencer synth with one soundtrack per city, plus all sound effects.
// Everything is generated with the Web Audio API, so there are no audio files to download.
import type { CityId } from "@/lib/data/cities";

export type SfxName =
  | "coin"
  | "jump"
  | "superjump"
  | "slide"
  | "lane"
  | "crash"
  | "stumble"
  | "powerup"
  | "shield"
  | "click"
  | "whoosh"
  | "reward"
  | "levelup"
  | "tick";

type Track = CityId | "menu";

interface Pattern {
  bpm: number;
  swing: number;
  root: number; // MIDI note of the key
  scale: number[];
  chords: number[][]; // per bar: scale degrees
  kick: string;
  snare: string;
  hat: string;
  perc?: string;
  bass: (number | null)[]; // 16 steps, scale degree (relative to chord root) or null
  lead: (number | null)[]; // 32 steps (2 bars), scale degree or null
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  padWave: OscillatorType;
  leadOct: number;
  logdrum?: boolean;
  pump?: boolean;
  vibrato?: boolean;
  filterSweep?: boolean;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const _ = null;

const PATTERNS: Record<Track, Pattern> = {
  menu: {
    bpm: 96, swing: 0, root: 57, scale: MINOR,
    chords: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
    kick: "x.......x.......", snare: "....x.......x...", hat: "..x...x...x...x.",
    bass: [0, _, _, _, _, _, 0, _, _, _, _, _, 0, _, _, _],
    lead: [7, _, 9, _, 11, _, 9, _, _, _, 7, _, _, _, _, _, 4, _, 7, _, 9, _, 7, _, _, _, 4, _, _, _, _, _],
    bassWave: "triangle", leadWave: "triangle", padWave: "sawtooth", leadOct: 1,
  },
  tokyo: {
    bpm: 124, swing: 0, root: 52, scale: MINOR,
    chords: [[0, 2, 4], [5, 7, 9], [2, 4, 6], [6, 8, 10]],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
    bass: [0, _, 7, _, 0, _, 7, _, 0, _, 7, _, 0, _, 7, 5],
    lead: [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 11, 9, 7, 4, 0, 4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 7, 4, 2, _],
    bassWave: "sawtooth", leadWave: "sawtooth", padWave: "sawtooth", leadOct: 1, filterSweep: true,
  },
  newyork: {
    bpm: 92, swing: 0.16, root: 50, scale: DORIAN,
    chords: [[0, 2, 4, 6], [3, 5, 7, 9], [1, 3, 5, 7], [4, 6, 8, 10]],
    kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.xx",
    bass: [0, _, _, _, _, _, _, 0, _, _, 4, _, _, _, _, _],
    lead: [_, _, 4, _, _, _, 6, _, 7, _, _, _, _, _, _, _, _, _, 9, _, 7, _, 6, _, 4, _, _, _, 2, _, _, _],
    bassWave: "triangle", leadWave: "triangle", padWave: "triangle", leadOct: 1,
  },
  dubai: {
    bpm: 110, swing: 0, root: 50, scale: HIJAZ,
    chords: [[0, 2, 4], [0, 2, 4], [6, 8, 10], [0, 2, 4]],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", perc: "x..x..x.x..x.x..",
    bass: [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, _, 1, _],
    lead: [4, _, 5, 4, 2, _, 1, _, 0, _, _, _, 1, 2, 4, _, 5, _, 7, _, 5, 4, 2, 1, 0, _, _, _, _, _, _, _],
    bassWave: "sawtooth", leadWave: "sawtooth", padWave: "sawtooth", leadOct: 1, vibrato: true,
  },
  london: {
    bpm: 132, swing: 0.2, root: 48, scale: MINOR,
    chords: [[0, 2, 4, 6], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
    kick: "x......x..x.....", snare: "....x.......x...", hat: "..x...x.x.x...xx", perc: "...x.......x..x.",
    bass: [0, _, _, 0, _, _, _, _, 0, _, 2, _, _, _, 0, _],
    lead: [_, _, 7, _, _, 9, _, _, 7, _, _, _, 4, _, _, _, _, _, 7, _, _, 9, _, 11, 9, _, _, _, 7, _, _, _],
    bassWave: "sawtooth", leadWave: "square", padWave: "sawtooth", leadOct: 1,
  },
  lagos: {
    bpm: 112, swing: 0.06, root: 55, scale: MAJOR,
    chords: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
    kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", perc: "..x..x....x..x..",
    bass: [0, _, _, 0, _, _, 4, _, _, _, 0, _, _, 4, _, _],
    lead: [4, _, 7, _, 9, 7, _, 4, _, 2, 4, _, _, _, _, _, 7, _, 9, _, 11, 9, 7, _, 4, _, 2, _, 0, _, _, _],
    bassWave: "sine", leadWave: "triangle", padWave: "triangle", leadOct: 1, logdrum: true,
  },
  paris: {
    bpm: 122, swing: 0, root: 53, scale: MINOR,
    chords: [[0, 2, 4, 6], [5, 7, 9, 11], [2, 4, 6, 8], [4, 6, 8, 10]],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.",
    bass: [0, _, 0, _, 7, _, 0, _, 0, _, 0, _, 7, _, 5, _],
    lead: [_, _, 7, _, _, _, 7, _, _, _, 7, _, _, _, 9, _, _, _, 7, _, _, _, 6, _, _, _, 4, _, _, _, _, _],
    bassWave: "square", leadWave: "sawtooth", padWave: "sawtooth", leadOct: 0, filterSweep: true, pump: true,
  },
  seoul: {
    bpm: 128, swing: 0, root: 47, scale: MINOR,
    chords: [[0, 2, 4], [5, 7, 9], [2, 4, 6], [6, 8, 10]],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", perc: "x.x.x.x.x.x.x.x.",
    bass: [0, _, 0, 0, _, 0, _, 0, 0, _, 0, 0, _, 0, 7, _],
    lead: [7, _, 7, 9, _, 11, _, 9, 7, _, 4, _, 7, _, _, _, 11, _, 11, 12, _, 11, _, 9, 7, _, 9, _, 7, _, _, _],
    bassWave: "sawtooth", leadWave: "sawtooth", padWave: "sawtooth", leadOct: 1, pump: true,
  },
  singapore: {
    bpm: 118, swing: 0.14, root: 50, scale: MAJOR,
    chords: [[0, 2, 4, 6], [3, 5, 7, 9], [5, 7, 9, 11], [4, 6, 8, 10]],
    kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.",
    bass: [0, _, _, _, _, _, 0, _, _, _, 4, _, _, _, _, _],
    lead: [9, _, 7, _, 4, _, _, _, 2, _, 4, _, _, _, _, _, 9, _, 11, _, 9, _, 7, _, 4, _, _, _, _, _, _, _],
    bassWave: "sine", leadWave: "triangle", padWave: "triangle", leadOct: 1,
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private delay!: DelayNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private track: Track | null = null;
  private step = 0;
  private nextTime = 0;
  musicOn = true;
  sfxOn = true;
  intensity = 0; // 0..1 adds energy as the run speeds up

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.32 : 0;
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.7 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.delay = this.ctx.createDelay(1);
      const fb = this.ctx.createGain();
      fb.gain.value = 0.32;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.25;
      this.delay.connect(fb).connect(this.delay);
      this.delay.connect(wet).connect(this.musicBus);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(music: boolean, sfx: boolean) {
    this.musicOn = music;
    this.sfxOn = sfx;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music ? 0.32 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx ? 0.7 : 0, t, 0.02);
  }

  // ── Music ──────────────────────────────────────────────────────────────
  playMusic(track: Track) {
    this.unlock();
    if (!this.ctx) return;
    if (this.track === track && this.timer !== null) return;
    this.stopMusic();
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.delay.delayTime.value = (60 / PATTERNS[track].bpm) * 0.75;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  get currentTrack() {
    return this.track;
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    const p = PATTERNS[this.track];
    const stepDur = 60 / p.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      const s = this.step % 16;
      const swing = s % 2 === 1 ? p.swing * stepDur : 0;
      this.playStep(p, this.step, this.nextTime + swing);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private note(p: Pattern, degree: number, octave = 0) {
    const sc = p.scale;
    const o = Math.floor(degree / sc.length);
    const idx = ((degree % sc.length) + sc.length) % sc.length;
    return p.root + sc[idx] + 12 * (o + octave);
  }

  private playStep(p: Pattern, step: number, t: number) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % p.chords.length;
    const chord = p.chords[bar];
    const energy = this.intensity;
    if (p.kick[s] === "x") {
      this.kick(t);
      if (p.pump) this.musicBus.gain.setValueAtTime(this.musicOn ? 0.18 : 0, t), this.musicBus.gain.linearRampToValueAtTime(this.musicOn ? 0.32 : 0, t + 0.18);
    }
    if (p.snare[s] === "x") this.snare(t, this.track === "newyork" ? 0.5 : 0.35);
    if (p.hat[s] === "x" && (energy > 0.15 || s % 2 === 0 || this.track === "menu")) this.hat(t, s % 4 === 2 ? 0.12 : 0.07);
    if (p.perc && p.perc[s] === "x") this.perc(t, this.track === "dubai" ? 320 : this.track === "lagos" ? 520 : 900);
    const b = p.bass[s];
    if (b !== null) {
      const freq = mtof(this.note(p, chord[0] + b, -1));
      if (p.logdrum) this.logdrum(t, freq);
      else this.bass(t, freq, p.bassWave, 60 / p.bpm / 2);
    }
    const lead = p.lead[step % 32];
    if (lead !== null && (energy > 0.05 || this.track === "menu")) {
      this.lead(t, mtof(this.note(p, lead, p.leadOct)), p.leadWave, 60 / p.bpm / 2.2, p.vibrato);
    }
    if (s === 0) for (const d of chord) this.pad(t, mtof(this.note(p, d, 0)), p.padWave, (60 / p.bpm) * 4, p.filterSweep);
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private kick(t: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.002, 0.9, 0.28);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.32);
  }

  private noiseHit(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, bus: GainNode) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    this.env(g, t, 0.002, gain, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number, gain: number) {
    this.noiseHit(t, 0.16, gain, "highpass", 1400, this.musicBus);
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const g = c.createGain();
    this.env(g, t, 0.002, gain * 0.6, 0.1);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.14);
  }

  private hat(t: number, gain: number) {
    this.noiseHit(t, 0.045, gain, "highpass", 7500, this.musicBus);
  }

  private perc(t: number, freq: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
    const g = c.createGain();
    this.env(g, t, 0.002, 0.18, 0.09);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.12);
  }

  private logdrum(t: number, freq: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 2, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    const g = c.createGain();
    this.env(g, t, 0.004, 0.55, 0.35);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.4);
  }

  private bass(t: number, freq: number, wave: OscillatorType, dur: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = c.createGain();
    this.env(g, t, 0.005, 0.32, dur);
    o.connect(f).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private lead(t: number, freq: number, wave: OscillatorType, dur: number, vibrato?: boolean) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    if (vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = freq * 0.012;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2600 + this.intensity * 2400;
    const g = c.createGain();
    this.env(g, t, 0.01, 0.11, dur);
    o.connect(f).connect(g);
    g.connect(this.musicBus);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pad(t: number, freq: number, wave: OscillatorType, dur: number, sweep?: boolean) {
    const c = this.ctx!;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(sweep ? 400 : 1200, t);
    if (sweep) f.frequency.linearRampToValueAtTime(2400, t + dur * 0.6);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + dur * 0.15);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.musicBus);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // ── SFX ────────────────────────────────────────────────────────────────
  private tone(freqs: number[], dur: number, wave: OscillatorType, gain: number, delayEach = 0) {
    const c = this.ctx!;
    const t0 = c.currentTime;
    freqs.forEach((fr, i) => {
      const t = t0 + i * delayEach;
      const o = c.createOscillator();
      o.type = wave;
      o.frequency.value = fr;
      const g = c.createGain();
      this.env(g, t, 0.004, gain, dur);
      o.connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  private sweep(from: number, to: number, dur: number, wave: OscillatorType, gain: number) {
    const c = this.ctx!;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    this.env(g, t, 0.005, gain, dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private coinPitch = 0;
  private lastCoin = 0;

  play(name: SfxName) {
    if (!this.ctx || !this.sfxOn) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case "coin": {
        // pitch climbs while collecting a trail of coins
        this.coinPitch = now - this.lastCoin < 0.35 ? Math.min(this.coinPitch + 1, 10) : 0;
        this.lastCoin = now;
        const base = 1320 * Math.pow(2, this.coinPitch / 24);
        this.tone([base, base * 1.5], 0.09, "square", 0.06, 0.05);
        break;
      }
      case "jump":
        this.sweep(260, 720, 0.18, "square", 0.08);
        break;
      case "superjump":
        this.sweep(200, 1400, 0.35, "sawtooth", 0.08);
        break;
      case "slide":
        this.noiseHit(now, 0.25, 0.25, "bandpass", 1800, this.sfxBus);
        break;
      case "lane":
        this.noiseHit(now, 0.09, 0.12, "bandpass", 3200, this.sfxBus);
        break;
      case "whoosh":
        this.noiseHit(now, 0.6, 0.25, "lowpass", 900, this.sfxBus);
        this.sweep(120, 900, 0.6, "sawtooth", 0.05);
        break;
      case "crash":
        this.noiseHit(now, 0.6, 0.6, "lowpass", 700, this.sfxBus);
        this.sweep(300, 40, 0.5, "sawtooth", 0.25);
        break;
      case "stumble":
        this.sweep(400, 140, 0.18, "square", 0.1);
        this.noiseHit(now, 0.12, 0.3, "lowpass", 1200, this.sfxBus);
        break;
      case "powerup":
        this.tone([523, 659, 784, 1047], 0.12, "triangle", 0.12, 0.06);
        break;
      case "shield":
        this.sweep(900, 200, 0.4, "triangle", 0.18);
        this.noiseHit(now, 0.3, 0.3, "highpass", 2000, this.sfxBus);
        break;
      case "click":
        this.tone([880], 0.05, "triangle", 0.08);
        break;
      case "tick":
        this.tone([1200], 0.04, "square", 0.04);
        break;
      case "reward":
        this.tone([659, 784, 988, 1319, 1568], 0.18, "triangle", 0.12, 0.08);
        break;
      case "levelup":
        this.tone([523, 659, 784, 1047, 1319, 1568, 2093], 0.2, "square", 0.06, 0.07);
        break;
    }
  }
}

export const audio = new AudioEngine();
