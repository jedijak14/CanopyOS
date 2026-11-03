/* CanopyOS — shared media state, backed by the generative music engine */
import { music } from './sound.js';
import { store } from './store.js';

const TRACKS = [
  { id: 'understory', title: 'Understory', artist: 'Canopy Ensemble', album: 'Green Noise', year: 2025, duration: 214, bpm: 84, root: 174.61, scale: [0, 3, 5, 7, 10], colors: ['#34e0a1', '#0a6e77'] },
  { id: 'fern', title: 'Fern Light', artist: 'Moss & Pine', album: 'Shade Tolerant', year: 2024, duration: 187, bpm: 96, root: 196, scale: [0, 2, 3, 7, 9], colors: ['#84cc16', '#166534'] },
  { id: 'rain', title: 'Rain on Glass', artist: 'Slow Canopy', album: 'Wet Season', year: 2023, duration: 252, bpm: 72, root: 146.83, scale: [0, 2, 5, 7, 9], colors: ['#60a5fa', '#1e3a8a'] },
  { id: 'mycelium', title: 'Mycelium', artist: 'Root Network', album: 'Underground', year: 2025, duration: 231, bpm: 100, root: 130.81, scale: [0, 3, 5, 6, 10], colors: ['#c084fc', '#4c1d95'] },
  { id: 'hummingbird', title: 'Hummingbird', artist: 'Aerial Bloom', album: 'Pollen', year: 2024, duration: 168, bpm: 112, root: 220, scale: [0, 2, 4, 7, 9], colors: ['#fbbf24', '#c2410c'] },
  { id: 'oldgrowth', title: 'Old Growth', artist: 'Canopy Ensemble', album: 'Green Noise', year: 2025, duration: 305, bpm: 64, root: 110, scale: [0, 5, 7, 10, 12], colors: ['#22d3ee', '#155e75'] },
  { id: 'clearing', title: 'The Clearing', artist: 'Sun Through Leaves', album: 'Phototropism', year: 2022, duration: 196, bpm: 90, root: 164.81, scale: [0, 2, 5, 9, 10], colors: ['#f472b6', '#831843'] },
];

let state = {
  index: 0,
  playing: false,
  position: 0,
  shuffle: false,
  repeat: 'off', // off | one | all
  volume: store.get('volume', 70),
};

const listeners = new Set();
let ticker = null;

function emit() {
  listeners.forEach((fn) => { try { fn(state, TRACKS[state.index]); } catch (e) { console.warn(e); } });
  window.dispatchEvent(new CustomEvent('canopy:media', { detail: { ...state, track: TRACKS[state.index] } }));
}

function startTicker() {
  stopTicker();
  ticker = setInterval(() => {
    if (!state.playing) return;
    state.position += 1;
    const t = TRACKS[state.index];
    if (state.position >= t.duration) {
      if (state.repeat === 'one') state.position = 0;
      else media.next(true);
      return;
    }
    emit();
  }, 1000);
}
function stopTicker() { if (ticker) clearInterval(ticker); ticker = null; }

export const media = {
  tracks: TRACKS,
  get() { return { ...state, track: TRACKS[state.index] }; },
  currentTrack() { return TRACKS[state.index]; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  play(index) {
    if (typeof index === 'number' && index !== state.index) {
      state.index = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
      state.position = 0;
    }
    state.playing = true;
    music.setVolume(store.get('volume', 70));
    music.play(TRACKS[state.index]);
    startTicker();
    emit();
    return state;
  },

  pause() {
    state.playing = false;
    music.stop();
    stopTicker();
    emit();
  },

  toggle() {
    if (state.playing) this.pause(); else this.play();
    return state.playing;
  },

  next(auto = false) {
    if (state.shuffle) {
      let n = state.index;
      while (n === state.index && TRACKS.length > 1) n = Math.floor(Math.random() * TRACKS.length);
      state.index = n;
    } else {
      state.index = (state.index + 1) % TRACKS.length;
    }
    state.position = 0;
    if (state.playing || auto) {
      state.playing = true;
      music.play(TRACKS[state.index]);
      startTicker();
    }
    emit();
  },

  prev() {
    if (state.position > 4) { state.position = 0; emit(); return; }
    state.index = (state.index - 1 + TRACKS.length) % TRACKS.length;
    state.position = 0;
    if (state.playing) { music.play(TRACKS[state.index]); startTicker(); }
    emit();
  },

  seek(pct) {
    state.position = Math.round(Math.max(0, Math.min(1, pct)) * TRACKS[state.index].duration);
    emit();
  },

  setShuffle(v) { state.shuffle = v ?? !state.shuffle; emit(); },
  setRepeat(mode) { state.repeat = mode; emit(); },
  setVolume(v) { store.set('volume', v); music.setVolume(v); emit(); },
  spectrum() { return music.spectrum(); },
  level() { return music.level(); },
};

export const fmtDuration = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
