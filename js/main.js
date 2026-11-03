/* CanopyOS — entry point */
import { store } from './core/store.js';
import { fs } from './core/fs.js';
import { data } from './core/data.js';
import { wm, getWorkarea } from './core/wm.js';
import { sound } from './core/sound.js';
import { initMenubar } from './ui/menubar.js';
import { initDock } from './ui/dock.js';
import { initDesktop } from './ui/desktop.js';
import { initWidgets } from './ui/widgets.js';
import { initShortcuts } from './ui/shortcuts.js';
import { initSession, sessionBoot } from './ui/system.js';
import { registerAll } from './apps/index.js';

/* Apply persisted appearance before first paint */
store.apply();
document.documentElement.style.setProperty('--brightness', String(store.get('brightness', 100) / 100));

registerAll();

/* Each subsystem is isolated so a single failure cannot stop the boot */
function safe(name, fn) {
  try { return fn(); } catch (err) { console.error(`[CanopyOS] ${name} failed to start`, err); return null; }
}

safe('menubar', initMenubar);
safe('dock', initDock);
safe('desktop', initDesktop);
safe('widgets', initWidgets);
safe('shortcuts', initShortcuts);
safe('session', initSession);

safe('boot', sessionBoot);

/* Large pointer ring (Settings → Accessibility → Pointer Size) */
(() => {
  const ring = document.getElementById('cursor-ring');
  if (!ring) return;
  const move = (e) => {
    if (document.documentElement.dataset.cursor !== 'large') return;
    ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  };
  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('canopy:setting', (e) => {
    if (e.detail && e.detail.key === 'cursorSize') {
      document.documentElement.dataset.cursor = e.detail.value;
    }
  });
})();

/* First gesture unlocks audio (browser autoplay policy) */
['pointerdown', 'keydown'].forEach((ev) => {
  window.addEventListener(ev, () => sound.unlockAudio(), { once: true });
});

/* Keep windows on screen when the viewport changes */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const wa = getWorkarea();
    [...wm.wins.values()].forEach((w) => {
      if (w.maximized) { w.setRect({ x: 0, y: wa.y, w: wa.width, h: wa.height }); return; }
      const r = w.getRect();
      const width = Math.min(r.w, wa.width - 20);
      const height = Math.min(r.h, wa.height - 20);
      const x = Math.max(0, Math.min(r.x, wa.width - 120));
      const y = Math.max(wa.y, Math.min(r.y, window.innerHeight - 80));
      w.setRect({ x, y, w: width, h: height });
    });
  }, 140);
});

/* Surface crashes instead of failing silently */
window.addEventListener('error', (e) => {
  console.error('[CanopyOS] Uncaught error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[CanopyOS] Unhandled promise rejection:', e.reason);
});

/* App-wide helpers for debugging in devtools */
window.CanopyOS = { store, fs, data, wm, sound };

// expose settings app to other modules lazily
export { store };
