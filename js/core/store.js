/* CanopyOS — persistent settings store */

const KEY = 'canopy.settings.v1';

export const DEFAULT_SETTINGS = {
  // appearance
  theme: 'light',              // light | dark | auto
  accent: '#0a84ff',
  wallpaper: 'canopy',
  customWallpaper: '',
  wallpaperLive: true,
  wallpaperSpeed: 1,
  wallpaperIntensity: 70,
  wallpaperTimeOfDay: true,
  wallpaperPauseWhenHidden: true,
  wallpaperLowPower: false,
  reduceMotion: false,
  transparency: true,
  contrast: 'normal',          // normal | high
  fontSize: 13,
  cornerRadius: 12,
  nightShift: false,

  // desktop
  dockSize: 54,
  dockMagnify: true,
  dockAutohide: false,
  dockPosition: 'bottom',
  widgets: true,
  desktopIcons: true,
  hotCornerTL: 'mission',
  hotCornerTR: 'desktop',
  hotCornerBL: 'launchpad',
  hotCornerBR: 'notification',

  // menubar
  clock24: false,
  showSeconds: false,
  showDate: true,
  batteryPct: true,

  // system
  sound: true,
  volume: 70,
  brightness: 100,
  wifi: true,
  bluetooth: true,
  airdrop: true,
  dnd: false,
  autoLockMinutes: 0,
  lockPassword: '',
  requirePassword: false,

  // user
  userName: 'Canopy User',
  avatarInitial: 'C',
  guestMode: false,

  // misc
  notifications: [],
  widgetsNote: 'Ship CanopyOS 1.0\nReview the dock magnifier\nWater the plants 🌿',
  firstRun: true,
  focusMode: 'off',
  wallpaperTint: 0,
  confirms: true,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  spaces: 3,
  stageManager: false,
  dockPinned: ['finder', 'launchpad', 'terminal', 'notes', 'mail', 'calendar', 'photos', 'music', 'paint', 'appstore', 'settings'],
  brightnessOn: true,
};

function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

class Store {
  constructor() {
    this.data = deepClone(DEFAULT_SETTINGS);
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) { /* corrupted storage falls back to defaults */ }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage may be full */ }
  }

  get(key, fallback) {
    const v = getPath(this.data, key);
    return v === undefined ? (fallback !== undefined ? fallback : getPath(DEFAULT_SETTINGS, key)) : v;
  }

  set(key, value, opts = {}) {
    setPath(this.data, key, value);
    this.save();
    this.apply();
    this.listeners.forEach((fn) => fn(key, value, this.data));
    if (!opts.silent) window.dispatchEvent(new CustomEvent('canopy:setting', { detail: { key, value } }));
    return value;
  }

  toggle(key) { return this.set(key, !this.get(key)); }

  all() { return this.data; }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  reset() {
    this.data = deepClone(DEFAULT_SETTINGS);
    this.save();
    this.apply();
    this.listeners.forEach((fn) => fn('*', null, this.data));
  }

  /** Resolve the effective theme, accounting for "auto". */
  effectiveTheme() {
    const t = this.get('theme');
    if (t === 'auto') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return t;
  }

  apply() {
    const s = this.data;
    const root = document.documentElement;
    root.dataset.theme = this.effectiveTheme();
    root.dataset.transparency = s.transparency ? 'on' : 'off';
    root.dataset.contrast = s.contrast;
    root.dataset.motion = s.reduceMotion ? 'reduced' : 'normal';
    root.dataset.dockMagnify = s.dockMagnify ? 'on' : 'off';
    root.dataset.dockAutohide = s.dockAutohide ? 'on' : 'off';
    root.dataset.dockPosition = s.dockPosition;
    root.dataset.widgets = s.widgets ? 'on' : 'off';
    root.dataset.dnd = s.dnd ? 'on' : 'off';
    root.dataset.nightsight = s.nightShift ? 'on' : 'off';
    root.style.setProperty('--accent', s.accent);
    root.style.setProperty('--accent-rgb', hexToRgb(s.accent).join(', '));
    root.style.setProperty('--dock-icon', `${s.dockSize}px`);
    root.style.setProperty('--font-size', `${s.fontSize}px`);
    root.style.setProperty('--radius-win', `${s.cornerRadius}px`);
    document.body.style.fontSize = `${s.fontSize}px`;
    this.applyWallpaper();
  }

  applyWallpaper() {
    const el = document.getElementById('wallpaper');
    if (!el) return;
    const s = this.data;
    if (s.wallpaper === 'custom' && s.customWallpaper) {
      el.className = '';
      el.style.background = s.customWallpaper;
    } else {
      el.style.background = '';
      el.className = `wp-${s.wallpaper}`;
    }
    const dock = document.getElementById('dock-shell');
    if (dock) dock.dataset.position = s.dockPosition;
  }
}

export function hexToRgb(hex) {
  const m = String(hex || '').replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full || '0a84ff', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => (amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return rgbToHex([f(r), f(g), f(b)]);
}

export const store = new Store();
window.addEventListener('canopy:setting', () => {});
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (store.get('theme') === 'auto') store.apply();
});
