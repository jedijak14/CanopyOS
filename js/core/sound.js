/* CanopyOS — UI sound design + generative music engine (WebAudio, no audio assets) */
import { store } from './store.js';

let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function volume() {
  const v = Number(store.get('volume', 70)) / 100;
  return Math.max(0, Math.min(1, v));
}

function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.16, at = 0, sweep = null, attack = 0.006, detune = 0 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), t0 + dur);
  if (detune) osc.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * volume()), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.16, gain = 0.08, at = 0, hp = 900 }) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain * volume();
  src.connect(f).connect(g).connect(master);
  src.start(c.currentTime + at);
}

const SFX = {
  click: () => tone({ freq: 1750, type: 'sine', dur: 0.035, gain: 0.05 }),
  open: () => { tone({ freq: 520, type: 'sine', dur: 0.14, gain: 0.09, sweep: 780 }); },
  close: () => { tone({ freq: 620, type: 'sine', dur: 0.13, gain: 0.08, sweep: 360 }); },
  minimize: () => tone({ freq: 800, type: 'sine', dur: 0.16, gain: 0.07, sweep: 300 }),
  error: () => { tone({ freq: 220, type: 'triangle', dur: 0.16, gain: 0.12 }); tone({ freq: 165, type: 'triangle', dur: 0.22, gain: 0.1, at: 0.12 }); },
  notify: () => { tone({ freq: 880, type: 'sine', dur: 0.18, gain: 0.1 }); tone({ freq: 1320, type: 'sine', dur: 0.26, gain: 0.08, at: 0.09 }); },
  success: () => { [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.22, gain: 0.08, at: i * 0.07 })); },
  trash: () => noise({ dur: 0.2, gain: 0.09, hp: 500 }),
  type: () => tone({ freq: 1200 + Math.random() * 400, type: 'square', dur: 0.018, gain: 0.018 }),
  snap: () => tone({ freq: 1000, type: 'sine', dur: 0.07, gain: 0.07, sweep: 1400 }),
  unlock: () => { [392, 523.25, 659.25, 1046.5].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.5, gain: 0.075, at: i * 0.055 })); },
  lock: () => { [659.25, 523.25, 392].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.4, gain: 0.06, at: i * 0.05 })); },
  chime: () => {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, i) => {
      tone({ freq: f, type: 'sine', dur: 3.4, gain: 0.075, at: i * 0.045, attack: 0.08 });
      tone({ freq: f * 2, type: 'sine', dur: 2.4, gain: 0.022, at: i * 0.045 + 0.02, attack: 0.1 });
    });
  },
  boot: () => {
    tone({ freq: 110, type: 'sine', dur: 1.8, gain: 0.06, attack: 0.4 });
    [261.63, 329.63, 392, 523.25].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 1.7, gain: 0.05, at: 0.25 + i * 0.09, attack: 0.15 }));
  },
  pop: () => tone({ freq: 660, type: 'sine', dur: 0.08, gain: 0.07, sweep: 990 }),
  toggle: () => tone({ freq: 440, type: 'sine', dur: 0.06, gain: 0.05 }),
  shutter: () => { noise({ dur: 0.05, gain: 0.16, hp: 1800 }); noise({ dur: 0.09, gain: 0.1, hp: 900 }); },
  swish: () => noise({ dur: 0.22, gain: 0.05, hp: 300 }),
};

export const sound = {
  play(name) {
    if (!store.get('sound')) return;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(); } catch (e) { /* audio may be blocked before a gesture */ }
  },
  unlockAudio() { ac(); },
  close() { if (ctx) { ctx.close(); ctx = null; } },
};

/* ---------------------------------------------------------------
   Generative music engine. Each "track" is a deterministic seed
   that picks a scale, tempo and timbre set.
   --------------------------------------------------------------- */
export class MusicEngine {
  constructor() {
    this.playing = false;
    this.timer = null;
    this.analyser = null;
    this.gainNode = null;
    this.track = null;
    this.step = 0;
    this.onStep = null;
    this.tempo = 84;
  }

  ensureGraph() {
    const c = ac();
    if (!c) return null;
    if (!this.analyser) {
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;
      this.gainNode = c.createGain();
      this.gainNode.gain.value = 0.9;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(master);
    }
    return c;
  }

  setVolume(pct) {
    this.ensureGraph();
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, pct / 100));
  }

  spectrum() {
    if (!this.analyser) return new Uint8Array(32);
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(arr);
    return arr;
  }

  level() {
    const s = this.spectrum();
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += s[i];
    return sum / s.length / 255;
  }

  play(track) {
    const c = this.ensureGraph();
    if (!c) return;
    this.stop();
    this.track = track || { id: 'canopy', bpm: 84, root: 174.61, scale: [0, 3, 5, 7, 10] };
    this.tempo = this.track.bpm || 84;
    this.playing = true;
    this.step = 0;
    const beat = (60 / this.tempo) * 1000;
    if (c.state === 'suspended') c.resume().catch(() => {});
    this.timer = setInterval(() => this.tick(), beat);
    this.tick();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    if (!this.playing) return;
    const c = ac();
    if (!c || !this.track) return;
    const { root, scale } = this.track;
    const step = this.step++;
    const chordRoots = [0, 0, 3, 4, 2, 5, 1, 4];
    const deg = chordRoots[step % chordRoots.length];
    const octave = step % 8 >= 4 ? 2 : 1;
    const base = root * octave;
    const semis = (d) => Math.pow(2, d / 12);
    const chord = [0, 2, 4].map((n) => base * semis(scale[(deg + n) % scale.length] + Math.floor((deg + n) / scale.length) * 12));
    const t = c.currentTime;
    chord.forEach((f, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1400;
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      osc.connect(filt).connect(g).connect(this.gainNode);
      osc.start(t);
      osc.stop(t + 2.5);
    });

    // lead pluck
    if (step % 2 === 0) {
      const n = scale[(step * 3) % scale.length] + (step % 4 === 0 ? 12 : 0) + 12;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * semis(n) * 2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(g).connect(this.gainNode);
      osc.start(t);
      osc.stop(t + 0.75);
    }

    // soft pulse
    if (step % 4 === 0) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g).connect(this.gainNode);
      osc.start(t);
      osc.stop(t + 0.24);
    }
    if (step % 2 === 1) {
      const len = Math.floor(c.sampleRate * 0.05);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6000;
      const g = c.createGain();
      g.gain.value = 0.03;
      src.connect(f).connect(g).connect(this.gainNode);
      src.start(t);
    }
    if (this.onStep) this.onStep(step, chord);
  }
}

export const music = new MusicEngine();
