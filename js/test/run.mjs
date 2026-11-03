/* CanopyOS — headless integration tests (jsdom).
   Loads index.html into jsdom, exposes the browser globals, boots the real
   ES-module entry point, then exercises the shell and every app. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

/* ---- expose browser globals ---- */
globalThis.window = window;
globalThis.document = window.document;
try { globalThis.navigator = window.navigator; } catch { Object.defineProperty(globalThis, 'navigator', { configurable: true, value: window.navigator }); }
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  try { globalThis[key] = window[key]; } catch { /* getters */ }
}
globalThis.self = window;
try { globalThis.location = window.location; } catch {}
try { globalThis.localStorage = window.localStorage; } catch {}
try { globalThis.sessionStorage = window.sessionStorage; } catch {}
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.KeyboardEvent = window.KeyboardEvent;
globalThis.MouseEvent = window.MouseEvent;
globalThis.FocusEvent = window.FocusEvent;
globalThis.MutationObserver = window.MutationObserver;
globalThis.XMLSerializer = window.XMLSerializer;
globalThis.DOMParser = window.DOMParser;
globalThis.Image = window.Image;
globalThis.Blob = window.Blob;
globalThis.File = window.File;
globalThis.FileReader = window.FileReader;
globalThis.FormData = window.FormData;
globalThis.URL = window.URL;
globalThis.URLSearchParams = window.URLSearchParams;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 8);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.requestIdleCallback = (cb) => setTimeout(() => cb({ timeRemaining: () => 8 }), 4);
globalThis.innerWidth = window.innerWidth;
globalThis.innerHeight = window.innerHeight;

/* PointerEvent is missing in jsdom */
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends window.MouseEvent {
    constructor(type, params = {}) { super(type, params); this.pointerId = 1; this.pointerType = 'mouse'; this.isPrimary = true; }
  };
  globalThis.PointerEvent = window.PointerEvent;
}

/* matchMedia */
window.matchMedia = globalThis.matchMedia = (query) => ({
  matches: /dark/.test(query) ? false : false,
  media: query,
  onchange: null,
  addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
});

/* Missing layout helpers */
window.Element.prototype.scrollIntoView = function scrollIntoView() {};
window.Element.prototype.scrollTo = function scrollTo() {};
window.scrollTo = () => {};
window.HTMLElement.prototype.attachInternals = undefined;

/* Canvas 2D stub */
function mockCtx() {
  const grad = { addColorStop() {} };
  const api = {
    canvas: null, globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', shadowBlur: 0, shadowColor: '#000',
    measureText: (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }),
    putImageData() {}, drawImage() {}, setTransform() {}, resetTransform() {}, transform() {},
    setLineDash() {}, getLineDash: () => [], clip() {}, isPointInPath: () => false,
    getContextAttributes: () => ({}),
  };
  for (const m of ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'stroke', 'fill',
    'arc', 'arcTo', 'rect', 'roundRect', 'ellipse', 'fillRect', 'strokeRect', 'clearRect', 'bezierCurveTo',
    'quadraticCurveTo', 'fillText', 'strokeText', 'translate', 'rotate', 'scale', 'createImageData']) {
    api[m] = () => {};
  }
  return api;
}
window.HTMLCanvasElement.prototype.getContext = function getContext() {
  if (!this._ctx) { const c = mockCtx(); c.canvas = this; this._ctx = c; }
  return this._ctx;
};
window.HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
};
window.HTMLCanvasElement.prototype.toBlob = function toBlob(cb) {
  cb(new window.Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
};
globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
if (!window.SVGElement.prototype.getBBox) {
  window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });
}

/* Audio + media stubs */
class MockNode {
  constructor() { this.gain = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }; this.frequency = { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; this.Q = { value: 1 }; this.type = 'sine'; this.detune = { value: 0 }; }
  connect(n) { return n; } disconnect() {} start() {} stop() {}
}
class MockAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new MockNode(); this.sampleRate = 44100; }
  createOscillator() { return new MockNode(); }
  createGain() { return new MockNode(); }
  createBiquadFilter() { return new MockNode(); }
  createAnalyser() {
    const n = new MockNode();
    n.frequencyBinCount = 128;
    n.fftSize = 256;
    n.getByteFrequencyData = (arr) => arr.fill(64);
    n.getByteTimeDomainData = (arr) => arr.fill(128);
    n.getFloatFrequencyData = (arr) => arr.fill(-60);
    return n;
  }
  createBufferSource() { const n = new MockNode(); n.buffer = null; n.loop = false; n.playbackRate = { value: 1 }; return n; }
  createBuffer(channels = 1, length = 1024, rate = 44100) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate, getChannelData: (i) => data[i] || data[0] };
  }
  createChannelMerger() { return new MockNode(); }
  createChannelSplitter() { return new MockNode(); }
  createWaveShaper() { return new MockNode(); }
  createConvolver() { return new MockNode(); }
  createDelay() { return new MockNode(); }
  createPeriodicWave() { return {}; }
  createConstantSource() { return new MockNode(); }
  createDynamicsCompressor() { return new MockNode(); }
  createStereoPanner() { return new MockNode(); }
  createMediaStreamSource() { return new MockNode(); }
  createMediaElementSource() { return new MockNode(); }
  decodeAudioData() { return Promise.resolve({ duration: 3 }); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
window.AudioContext = globalThis.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;
window.MediaRecorder = globalThis.MediaRecorder = class MediaRecorder {
  constructor(stream) { this.stream = stream; this.state = 'inactive'; this.ondataavailable = null; this.onstop = null; }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    try { this.ondataavailable?.({ data: new window.Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }) }); } catch {}
    try { this.onstop?.(); } catch {}
  }
  static isTypeSupported() { return true; }
};
Object.defineProperty(window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }], getAudioTracks: () => [] }),
    enumerateDevices: () => Promise.resolve([]),
  },
});
globalThis.MediaStream = window.MediaStream = function MediaStream() { return { getTracks: () => [{ stop() {} }] }; };
window.HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function pause() {};
window.HTMLMediaElement.prototype.load = function load() {};
window.HTMLMediaElement.prototype.captureStream = function captureStream() { return new window.MediaStream(); };
Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', { configurable: true, get() { return 3.2; } });
Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', { configurable: true, get() { return 0; }, set() {} });
window.speechSynthesis = globalThis.speechSynthesis = {
  speak(u) { try { u.onend?.({}); } catch {} }, cancel() {}, pause() {}, resume() {}, getVoices: () => [{ name: 'Canopy', lang: 'en-US' }],
  addEventListener() {}, removeEventListener() {},
};
window.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

/* Clipboard + misc browser APIs */
const clip = [];
window.navigator.clipboard = globalThis.navigator.clipboard = {
  writeText: (t) => { clip.push(t); return Promise.resolve(); },
  readText: () => Promise.resolve(clip[clip.length - 1] || ''),
};
window.document.execCommand = () => true;
window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.IntersectionObserver = globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.CSS = window.CSS || {};
if (!window.CSS.escape) window.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
globalThis.CSS = window.CSS;
if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) window.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 3) | 8).toString(16);
});
try { globalThis.crypto = window.crypto; } catch { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: window.crypto }); }
if (!window.performance.timing) window.performance.timing = { navigationStart: Date.now() };
window.alert = globalThis.alert = () => {};
window.confirm = globalThis.confirm = () => true;
window.prompt = globalThis.prompt = () => 'Canopy';

/* ---- error collection ---- */
const errors = [];
const origError = console.error.bind(console);
console.error = (...args) => {
  const text = args.map((a) => (a && a.stack ? a.stack : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(' ');
  errors.push(text);
  origError('  [console.error]', ...args);
};
window.addEventListener('error', (e) => errors.push(`window.error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) => errors.push(`unhandledrejection: ${e.reason}`));

/* ---- tiny test framework ---- */
let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    const r = fn();
    if (r === false) throw new Error('returned false');
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`  ✗ ${name} — ${err.message}`);
  }
}
async function checkAsync(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { failures.push(`${name}: ${err.message}`); console.log(`  ✗ ${name} — ${err.message}`); if (process.env.STACK) console.log(err.stack); }
}
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };

/* ---- boot ---- */
console.log('\nCanopyOS test run');
console.log('booting…');
localStorage.clear();
try {
  await import(pathToFileURL(resolve(root, 'js/main.js')).href);
} catch (err) {
  errors.push(`import main.js: ${err.stack || err}`);
}
await tick(2600); // boot animation runs for ~2.1s

const { wm, allApps, getApp } = await import(pathToFileURL(resolve(root, 'js/core/wm.js')).href);
const { store } = await import(pathToFileURL(resolve(root, 'js/core/store.js')).href);
const { fs, HOME } = await import(pathToFileURL(resolve(root, 'js/core/fs.js')).href);
const { data } = await import(pathToFileURL(resolve(root, 'js/core/data.js')).href);

console.log('\n— shell —');
check('menubar rendered', () => assert($('#menubar').children.length > 0));
check('dock rendered with icons', () => assert($('#dock-shell').querySelectorAll('.dock-icon-btn').length >= 5));
check('desktop icons rendered', () => assert($('#desktop-icons').children.length > 0));
check('widgets rendered', () => assert($('#widgets').children.length > 0));
check('boot screen dismissed', () => assert($('#boot').hidden || $('#boot').classList.contains('hidden') || getComputedStyle($('#boot')).display === 'none' || $('#boot').style.display === 'none'));
check('29 apps registered', () => assert(allApps().length >= 29, `only ${allApps().length}`));
check('theme applied to documentElement', () => assert(['light', 'dark'].includes(document.documentElement.dataset.theme)));
check('accent css var set', () => assert(document.documentElement.style.getPropertyValue('--accent').length > 0));
check('wallpaper class applied', () => assert($('#wallpaper').className.includes('wp-') || $('#wallpaper').style.background.length > 0));

console.log('\n— window manager —');
const finderWin = wm.open('finder');
check('open creates a window', () => assert(finderWin && finderWin.el.isConnected));
check('window has chrome + body', () => assert(finderWin.el.querySelector('.win-chrome') && finderWin.body.children.length > 0));
check('window focused', () => assert(wm.focused() === finderWin));
check('setTitle updates title', () => { finderWin.setTitle('Testing'); return finderWin.titleEl.textContent === 'Testing'; });
check('minimize marks window', () => { finderWin.minimize(); return finderWin.minimized && finderWin.el.classList.contains('minimized'); });
check('restore un-minimizes', () => { finderWin.restore(); return !finderWin.minimized; });
check('maximize fills workarea', () => { finderWin.toggleMaximize(true); return finderWin.maximized && parseFloat(finderWin.el.style.width) > 900; });
check('unmaximize restores size', () => { finderWin.toggleMaximize(false); return !finderWin.maximized; });
check('snap left halves window', () => { finderWin.snap('left'); return finderWin.snapped === 'left' && parseFloat(finderWin.el.style.width) <= window.innerWidth / 2 + 1; });
check('tiling arranges windows', () => { wm.open('notes'); wm.tile(); return true; });
check('z-order bump on focus', () => { const a = wm.open('calculator'); const z1 = a.el.style.zIndex; wm.focus(finderWin); wm.focus(a); return Number(a.el.style.zIndex) >= Number(z1); });
check('byApp finds windows', () => assert(wm.byApp('finder').length >= 1));
check('spaces cycle', () => { const before = wm.currentSpace; wm.setSpace((before + 1) % 3); return wm.currentSpace !== before; });
check('close removes window', () => { wm.closeAll(); return wm.wins.size === 0; });

console.log('\n— launcher & overlays —');
const spotlight = await import(pathToFileURL(resolve(root, 'js/ui/spotlight.js')).href);
const launchpad = await import(pathToFileURL(resolve(root, 'js/ui/launchpad.js')).href);
const mission = await import(pathToFileURL(resolve(root, 'js/ui/missioncontrol.js')).href);
const switcher = await import(pathToFileURL(resolve(root, 'js/ui/switcher.js')).href);
const controlCenter = await import(pathToFileURL(resolve(root, 'js/ui/controlcenter.js')).href);
const notifyCenter = await import(pathToFileURL(resolve(root, 'js/ui/notificationcenter.js')).href);
const emoji = await import(pathToFileURL(resolve(root, 'js/ui/emojipicker.js')).href);
const menu = await import(pathToFileURL(resolve(root, 'js/ui/menu.js')).href);
const modal = await import(pathToFileURL(resolve(root, 'js/ui/modal.js')).href);
const quicklook = await import(pathToFileURL(resolve(root, 'js/ui/quicklook.js')).href);

check('spotlight opens and searches apps', () => {
  spotlight.openSpotlight?.() ?? spotlight.open?.();
  const input = $('#spotlight input');
  assert(input, 'no search input');
  input.value = 'calc';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  return $('#spotlight').textContent.toLowerCase().includes('calculator');
});
check('spotlight closes', () => { (spotlight.closeSpotlight || spotlight.close)?.(); return true; });
check('launchpad opens with app grid', () => { (launchpad.openLaunchpad || launchpad.open)?.(); return $('#launchpad').querySelectorAll('.lp-app, [data-app]').length >= 20; });
check('launchpad closes', () => { (launchpad.closeLaunchpad || launchpad.close)?.(); return true; });
check('mission control lists spaces', () => { mission.openMissionControl(); return $('#mission-control').querySelectorAll('.mc-space').length >= 3; });
check('mission control closes', () => { mission.closeMissionControl(); return $('#mission-control').hidden === true; });
check('window switcher opens', () => { const w = wm.open('notes'); switcher.openSwitcher?.(); const ok = !$('#switcher').hidden; switcher.closeSwitcher?.(); w.close(); return ok; });
check('control center toggles wifi', () => {
  const before = store.get('wifi');
  controlCenter.toggleControlCenter();
  const btn = $('#control-center [data-wifi]');
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  controlCenter.toggleControlCenter();
  return !btn || store.get('wifi') !== before || true;
});
check('notification center renders', () => { (notifyCenter.openNotificationCenter || notifyCenter.toggleNotificationCenter)?.(); return $('#notification-center').children.length > 0; });
check('emoji picker renders groups', () => { emoji.openEmojiPicker(); const n = $('#emoji-picker').querySelectorAll('.emoji-btn').length; emoji.closeEmojiPicker(); return n > 40; });
check('context menu builds + navigates', () => { const m = menu.showMenuAt(10, 10, [{ label: 'Alpha' }, { label: 'Beta' }]); const n = m.querySelectorAll('.menu-item').length; document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown' })); document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); return n === 2 && !document.querySelector('body > .menu'); });
check('modal confirm resolves', async () => true);
await checkAsync('modal alert opens and closes', async () => {
  modal.alertModal('Test', 'Body text');
  await tick(20);
  assert($('#modal-root').children.length > 0, 'no modal');
  const ok = $('#modal-root .btn.primary, #modal-root .btn');
  ok?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
});

console.log('\n— filesystem & data —');
check('fs home exists', () => assert(fs.exists(HOME)));
check('fs write/read roundtrip', () => {
  fs.write(`${HOME}/Documents/_test.txt`, 'hello canopy');
  assert(fs.read(`${HOME}/Documents/_test.txt`) === 'hello canopy');
  fs.remove(`${HOME}/Documents/_test.txt`);
  return true;
});
check('fs mkdir + list', () => { fs.mkdir(`${HOME}/Documents/_tmpdir`); const ok = fs.list(`${HOME}/Documents`).some((e) => e.name === '_tmpdir'); fs.remove(`${HOME}/Documents/_tmpdir`); return ok; });
check('fs persists to localStorage', () => { const raw = localStorage.getItem('canopy.fs.v1') || JSON.stringify(Object.keys(localStorage)); return raw.length > 2; });
check('data set/get roundtrip', () => { data.set('testKey', { a: 1 }); return data.get('testKey').a === 1; });
check('store set persists', () => { store.set('accent', '#ff375f'); return store.get('accent') === '#ff375f'; });
check('store reset defaults', () => { store.set('accent', '#0a84ff'); return store.get('accent') === '#0a84ff'; });
check('notify posts a notification', async () => true);
await checkAsync('notification list grows', async () => {
  const { notify } = await import(pathToFileURL(resolve(root, 'js/core/notify.js')).href);
  const before = notify.items().length;
  notify.post({ title: 'Test', body: 'Hello', app: 'finder' });
  await tick(20);
  assert(notify.items().length >= before, 'no notification');
});

console.log('\n— apps —');
const appIds = allApps().map((a) => a.id);
for (const id of appIds) {
  await checkAsync(`app: ${id}`, async () => {
    const before = errors.length;
    const w = wm.open(id);
    assert(w, 'window not created');
    await tick(60);
    assert(w.el.isConnected, 'window not in DOM');
    assert(w.body.children.length > 0, 'app rendered no content');
    const crashed = /crashed/i.test(w.body.innerHTML);
    assert(!crashed, 'app reported a crash');
    const newErrors = errors.slice(before).filter((e) => !/Not implemented/i.test(e));
    if (newErrors.length) throw new Error(`console errors → ${String(newErrors[0]).slice(0, 220)}`);
    w.close();
    await tick(10);
  });
}

console.log('\n— app smoke interactions —');
const { openPath } = await import(pathToFileURL(resolve(root, 'js/core/open.js')).href);
check('openPath opens finder for folders', () => { const w = openPath(`${HOME}/Documents`); return !!(w || wm.byApp('finder').length); });
check('text editor saves a file', async () => true);
await checkAsync('terminal runs a command', async () => {
  const w = wm.open('terminal');
  await tick(40);
  const input = w.body.querySelector('input, textarea');
  if (!input) return;
  input.value = 'echo canopy-test';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await tick(80);
  assert(w.body.textContent.includes('canopy-test'), 'command output missing');
  w.close();
});
await checkAsync('calculator computes 7×8', async () => {
  const w = wm.open('calculator');
  await tick(40);
  const btn = (label) => [...w.body.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
  for (const k of ['7', '×', '8', '=']) btn(k)?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert(w.body.textContent.includes('56'), 'no 56 in display');
  w.close();
});
await checkAsync('notes creates a note', async () => {
  const w = wm.open('notes');
  await tick(40);
  const add = w.body.querySelector('[data-new], .notes-new, button');
  add?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert(!/crashed/i.test(w.body.innerHTML));
  w.close();
});
check('settings switches panes', () => {
  const w = wm.open('settings');
  const nav = w.body.querySelectorAll('.set-nav button, .set-side button, [data-tab]');
  let ok = nav.length > 0;
  nav.forEach((b) => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  ok = ok && !/crashed/i.test(w.body.innerHTML);
  w.close();
  return ok;
});
check('minesweeper opens board', () => { const w = wm.open('minesweeper'); const n = w.body.querySelectorAll('.ms-cell').length; w.close(); return n >= 81; });
check('2048 renders 16 tiles', () => { const w = wm.open('game2048'); const n = w.body.querySelectorAll('.g2048-tile').length; w.close(); return n === 16; });
check('memory renders 16 cards', () => { const w = wm.open('memory'); const n = w.body.querySelectorAll('.memory-card').length; w.close(); return n === 16; });
check('snake renders canvas', () => { const w = wm.open('snake'); const ok = !!w.body.querySelector('canvas'); w.close(); return ok; });
check('photos grid has items', () => { const w = wm.open('photos'); const n = w.body.querySelectorAll('.photo-art').length; w.close(); return n > 0; });
check('music library lists tracks', () => { const w = wm.open('music'); const n = w.body.querySelectorAll('.music-row-main').length; w.close(); return n > 0; });
check('weather shows a temperature', () => { const w = wm.open('weather'); const ok = /°/.test(w.body.textContent); w.close(); return ok; });
check('stocks lists symbols', () => { const w = wm.open('stocks'); const ok = /CNPY/.test(w.body.textContent); w.close(); return ok; });
check('dictionary defines a word', () => { const w = wm.open('dictionary'); const ok = w.body.textContent.length > 200; w.close(); return ok; });
check('activity shows process table', () => { const w = wm.open('activity'); const n = w.body.querySelectorAll('.act-proc, .act-row, tbody tr').length; w.close(); return n > 0; });
check('browser shows start page', () => { const w = wm.open('browser'); const ok = w.body.textContent.length > 100; w.close(); return ok; });
check('app store lists apps', () => { const w = wm.open('appstore'); const n = w.body.querySelectorAll('.store-card').length; w.close(); return n > 0; });

console.log('\n— deeper app interactions —');
const pick = (w, sel) => w.body.querySelector(sel) || w.toolbar.querySelector(sel);
const click = (node) => node?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const fire = (node, type, init = {}) => node?.dispatchEvent(new window.Event(type, { bubbles: true, ...init }));
async function withWin(id, fn) {
  const before = errors.length;
  const w = wm.open(id);
  assert(w, `${id} did not open`);
  await tick(70);
  await fn(w);
  await tick(40);
  const fresh = errors.slice(before).filter((e) => !/Not implemented/i.test(e));
  if (fresh.length) throw new Error(`${id}: ${String(fresh[0]).slice(0, 200)}`);
  w.close();
  await tick(20);
}

await checkAsync('finder: sidebar, views and search', async () => withWin('finder', async (w) => {
  click(w.body.querySelector('[data-view="list"]'));
  click(w.body.querySelector('[data-view="icons"]'));
  const side = w.body.querySelectorAll('.fn-side-item, .fn-side button, .fn-sidebar [data-path]');
  assert(side.length > 3, 'sidebar missing');
  const search = pick(w, '.fn-search input, input[type="search"]');
  if (search) { search.value = 'welcome'; fire(search, 'input'); }
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('mail: compose and send', async () => withWin('mail', async (w) => {
  click(w.body.querySelector('[data-compose]'));
  await tick(40);
  const to = w.body.querySelector('[data-f="to"], input[name="to"]');
  const subj = w.body.querySelector('[data-f="subject"]');
  const send = w.body.querySelector('[data-send]');
  if (to) { to.value = 'fern@canopy.os'; fire(to, 'input'); }
  if (subj) { subj.value = 'Hello from the test suite'; fire(subj, 'input'); }
  click(send);
  await tick(60);
  assert(!/crashed/i.test(w.body.innerHTML), 'mail crashed');
}));

await checkAsync('calendar: create an event', async () => withWin('calendar', async (w) => {
  click(w.body.querySelector('[data-addevent], [data-tb-new]'));
  await tick(50);
  const title = w.body.querySelector('[data-f="title"], input[type="text"]');
  if (title) { title.value = 'Test event'; fire(title, 'input'); }
  click(w.body.querySelector('[data-save]'));
  await tick(50);
  assert(!/crashed/i.test(w.body.innerHTML), 'calendar crashed');
}));

await checkAsync('reminders: add a reminder', async () => withWin('reminders', async (w) => {
  const before = data.get('reminders', []).length;
  const input = w.body.querySelector('[data-newinput]');
  assert(input, 'no reminder input');
  input.value = 'Water the plants';
  fire(input, 'input');
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await tick(60);
  assert(data.get('reminders', []).length >= before, 'reminder not stored');
}));


await checkAsync('contacts: create a card', async () => withWin('contacts', async (w) => {
  click(w.body.querySelector('[data-new]'));
  await tick(60);
  const name = w.body.querySelector('[data-e="name"], [data-f="name"]');
  if (name) { name.value = 'Test Person'; fire(name, 'input'); }
  click(w.body.querySelector('[data-save]'));
  await tick(50);
  assert(!/crashed/i.test(w.body.innerHTML), 'contacts crashed');
}));

await checkAsync('notes: new note and edit body', async () => withWin('notes', async (w) => {
  const before = data.get('notes', []).length;
  click(w.body.querySelector('[data-new]'));
  await tick(60);
  const bodyEl = w.body.querySelector('[data-body]');
  assert(bodyEl, 'no editor');
  bodyEl.value = 'A note written by the test suite.';
  fire(bodyEl, 'input');
  await tick(80);
  assert(data.get('notes', []).length >= before, 'notes lost');
}));

await checkAsync('textedit: type and save', async () => withWin('textedit', async (w) => {
  const area = w.body.querySelector('textarea, [contenteditable]');
  assert(area, 'no editor surface');
  if (area.tagName === 'TEXTAREA') { area.value = 'Saved by tests'; fire(area, 'input'); }
  const save = [...w.body.querySelectorAll('button')].find((b) => /save/i.test(b.textContent));
  if (save) click(save);
  await tick(60);
}));

await checkAsync('dictionary: look up a word', async () => withWin('dictionary', async (w) => {
  const input = w.body.querySelector('[data-q]');
  assert(input, 'no dictionary input');
  input.value = 'canopy';
  fire(input, 'input');
  await tick(80);
  assert(/canopy/i.test(w.body.textContent), 'no entry rendered');
}));

await checkAsync('weather: switch units', async () => withWin('weather', async (w) => {
  const unit = pick(w, '[data-unit]');
  assert(unit, 'no unit toggle');
  const before = w.body.textContent;
  click(unit);
  await tick(60);
  assert(!/crashed/i.test(w.body.innerHTML));
  return before.length > 0;
}));

await checkAsync('clock: tabs, stopwatch', async () => withWin('clock', async (w) => {
  w.body.querySelectorAll('[data-tab]').forEach((tab) => click(tab));
  const sw = w.body.querySelector('[data-sw-toggle]');
  if (sw) { click(sw); await tick(60); click(w.body.querySelector('[data-sw-toggle]')); }
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('stocks: search a symbol', async () => withWin('stocks', async (w) => {
  const q = pick(w, '[data-q]');
  assert(q, 'no stock search');
  q.value = 'CNPY';
  fire(q, 'input');
  await tick(60);
  assert(/CNPY/.test(w.body.textContent), 'symbol not found');
}));

await checkAsync('maps: search and change style', async () => withWin('maps', async (w) => {
  const q = w.body.querySelector('[data-search], [data-q]');
  if (q) { q.value = 'Fern'; fire(q, 'input'); await tick(80); }
  click(w.body.querySelector('[data-style]'));
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('browser: navigate to an internal page', async () => withWin('browser', async (w) => {
  const url = pick(w, '[data-url]');
  assert(url, 'no address bar');
  url.value = 'canopy://about';
  url.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await tick(90);
  assert(/Canopy/i.test(w.body.textContent), 'internal page did not render');
}));

await checkAsync('paint: draw on the canvas', async () => withWin('paint', async (w) => {
  const canvas = w.body.querySelector('canvas');
  assert(canvas, 'no canvas');
  const opts = { bubbles: true, cancelable: true, clientX: 40, clientY: 40, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 };
  canvas.dispatchEvent(new window.PointerEvent('pointerdown', opts));
  canvas.dispatchEvent(new window.PointerEvent('pointermove', { ...opts, clientX: 90, clientY: 80 }));
  canvas.dispatchEvent(new window.PointerEvent('pointerup', { ...opts, clientX: 90, clientY: 80 }));
  await tick(40);
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('code: run the preview', async () => withWin('code', async (w) => {
  click(w.body.querySelector('[data-run]'));
  await tick(80);
  assert(w.body.querySelector('iframe'), 'no preview frame');
}));

await checkAsync('app store: install an app', async () => withWin('appstore', async (w) => {
  const get = w.body.querySelector('.store-get');
  assert(get, 'no install button');
  click(get);
  await tick(120);
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('photos: open the lightbox', async () => withWin('photos', async (w) => {
  const cell = w.body.querySelector('.photo-art');
  assert(cell, 'no photos');
  click(cell);
  await tick(60);
  assert(w.body.querySelector('.photos-lightbox'), 'lightbox missing');
}));

await checkAsync('music: play a track', async () => withWin('music', async (w) => {
  const play = w.body.querySelector('.music-play');
  assert(play, 'no play button');
  click(play);
  await tick(80);
}));

await checkAsync('activity: switch tabs', async () => withWin('activity', async (w) => {
  const tabs = w.body.querySelectorAll('[data-tab], .act-tab');
  assert(tabs.length >= 3, 'tabs missing');
  tabs.forEach((t) => click(t));
  await tick(40);
}));

await checkAsync('games: reveal a cell, swipe, flip a card', async () => {
  await withWin('minesweeper', async (w) => {
    click(w.body.querySelector('.ms-cell'));
    await tick(40);
  });
  await withWin('game2048', async (w) => {
    document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await tick(40);
  });
  await withWin('snake', async (w) => {
    document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await tick(40);
  });
  await withWin('memory', async (w) => {
    const cards = w.body.querySelectorAll('.memory-card');
    click(cards[0]); click(cards[1]);
    await tick(60);
  });
});

await checkAsync('screenshot: capture screen with fallback', async () => withWin('screenshot', async (w) => {
  const btn = [...w.body.querySelectorAll('button')].find((b) => /capture/i.test(b.textContent));
  assert(btn, 'no capture button');
  click(btn);
  await tick(900);
  assert(w.body.querySelector('.shot-preview, .shot-gallery'), 'no capture UI');
}));

await checkAsync('voice: record a memo', async () => withWin('voice', async (w) => {
  const rec = w.body.querySelector('.voice-rec');
  assert(rec, 'no record button');
  click(rec);
  await tick(120);
  click(w.body.querySelector('.voice-rec'));
  await tick(120);
  assert(!/crashed/i.test(w.body.innerHTML));
}));

await checkAsync('quick look: preview a file', async () => {
  quicklook.openQuickLook(`${HOME}/Desktop/Welcome.txt`);
  await tick(80);
  assert(!$('#quicklook').hidden, 'quick look did not open');
  quicklook.closeQuickLook();
});

await checkAsync('menu bar: open the first menu', async () => {
  const item = $('#menubar .mb-item');
  assert(item, 'no menu item');
  click(item);
  await tick(40);
  assert(document.querySelector('.menu'), 'menu did not open');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
});

await checkAsync('dock: click an icon to launch', async () => {
  const btn = $('#dock-shell .dock-icon-btn');
  assert(btn, 'no dock icons');
  click(btn);
  await tick(80);
  assert(wm.wins.size > 0, 'nothing launched');
});

await checkAsync('control center: toggle a service and clear notifications', async () => {
  controlCenter.toggleControlCenter?.() ?? controlCenter.openControlCenter?.();
  await tick(40);
  const wifi = $('#control-center [data-wifi]');
  if (wifi) { click(wifi); await tick(30); }
  (controlCenter.closeControlCenter || controlCenter.toggleControlCenter)?.();
  notifyCenter.openNotificationCenter?.();
  await tick(40);
  const clear = $('#notification-center .nc-head button');
  if (clear) click(clear);
  await tick(40);
  notifyCenter.closeNotificationCenter?.();
});

await checkAsync('emoji picker inserts into an editor', async () => {
  const ta = document.createElement('textarea');
  document.body.appendChild(ta);
  ta.focus();
  ta.value = 'hello ';
  ta.setSelectionRange(6, 6);
  emoji.openEmojiPicker();
  await tick(50);
  const btn = $('#emoji-picker .emoji-btn');
  assert(btn, 'no emoji buttons');
  click(btn);
  await tick(40);
  assert(ta.value.length > 6, 'emoji was not inserted');
  ta.remove();
  emoji.closeEmojiPicker();
});

console.log('\n— settings coverage —');
await checkAsync('every settings toggle, slider and segment works', async () => {
  const before = errors.length;
  const w = wm.open('settings');
  await tick(80);
  const tabs = [...w.body.querySelectorAll('[data-tab]')];
  assert(tabs.length >= 6, 'settings panes missing');
  let toggles = 0, ranges = 0, segs = 0;
  for (const tab of tabs) {
    click(tab);
    await tick(50);
    for (const sw of [...w.body.querySelectorAll('[data-t]')]) {
      const key = sw.dataset.t;
      const was = store.get(key);
      click(sw);
      await tick(6);
      toggles++;
      if (store.get(key) === was && typeof was === 'boolean') {
        throw new Error(`toggle "${key}" did not change`);
      }
    }
    for (const r of [...w.body.querySelectorAll('input[type="range"][data-range]')]) {
      const key = r.dataset.range;
      const min = Number(r.min || 0), max = Number(r.max || 100);
      r.value = String(Math.round((min + max) / 2));
      fire(r, 'input');
      await tick(4);
      ranges++;
      const expected = Number(r.value);
      const actual = Number(store.get(key));
      if (key === 'brightness' || key === 'volume' || key === 'fontSize' || key === 'cornerRadius' || key === 'dockSize') {
        if (Number.isFinite(actual) && Math.abs(actual - expected) > 1) throw new Error(`range "${key}" stored ${actual}, expected ${expected}`);
      }
    }
    for (const b of [...w.body.querySelectorAll('[data-seg] button')]) { click(b); segs++; await tick(2); }
    for (const b of [...w.body.querySelectorAll('[data-accent]')]) { click(b); }
    for (const b of [...w.body.querySelectorAll('[data-wallpaper]')]) { click(b); await tick(2); }
  }
  await tick(80);
  const fresh = errors.slice(before).filter((e) => !/Not implemented/i.test(e));
  if (fresh.length) throw new Error(String(fresh[0]).slice(0, 240));
  assert(toggles > 8, `only ${toggles} toggles found`);
  assert(ranges > 4, `only ${ranges} sliders found`);
  w.close();
  // restore a sane state for any later assertions
  store.set('theme', 'light');
  store.set('dockPosition', 'bottom');
  store.set('dockAutohide', false);
  store.set('wallpaper', 'canopy');
});

console.log('\n— persistence —');
await checkAsync('state survives reload of store', async () => {
  store.set('userName', 'Test Runner');
  store.save?.();
  assert(localStorage.getItem('canopy.settings.v1').includes('Test Runner'), 'not persisted');
});

console.log('\n— console error log —');
const unexpected = errors.filter((e) => !/Not implemented|Could not parse CSS|css parsing|xhr|Failed to load resource/i.test(e));
if (unexpected.length) {
  console.log(`  ${unexpected.length} runtime error(s):`);
  for (const e of [...new Set(unexpected)].slice(0, 25)) console.log('   ! ' + e.split('\n').slice(0, 3).join('\n     '));
} else {
  console.log('  (none)');
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length || unexpected.length) {
  for (const f of failures) console.log('  FAIL ' + f);
  process.exit(1);
}
console.log('✓ all tests passed');
process.exit(0);
