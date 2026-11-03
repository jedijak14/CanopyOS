/* CanopyOS — window manager: windows, snapping, spaces, focus, z-order */
import { glyph, appIcon } from './icons.js';
import { store } from './store.js';
import { sound } from './sound.js';

const registry = new Map();
const wins = new Map();
let seq = 0;
let zTop = 100;
let focusedId = null;
let cascade = 0;

const $ = (sel, root = document) => root.querySelector(sel);

export function getWorkarea() {
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menubar-h')) || 28;
  return { x: 0, y: top, width: window.innerWidth, height: window.innerHeight - top };
}

export function registerApp(app) {
  if (!app || !app.id) throw new Error('App requires an id');
  registry.set(app.id, { singleton: false, width: 760, height: 520, ...app });
  return app;
}

export const getApp = (id) => registry.get(id);
export const allApps = () => [...registry.values()];
export const runningWindows = () => [...wins.values()];

class Win {
  constructor(app, opts = {}) {
    this.id = `win-${++seq}`;
    this.app = app;
    this.appId = app.id;
    this.args = opts.args || null;
    this.space = opts.space ?? wm.currentSpace;
    this.minimized = false;
    this.maximized = false;
    this.snapped = null;
    this.prevRect = null;
    this.closed = false;
    this.cleanupFns = [];
    this.closeFns = [];
    this.menus = app.menus || [];
    this.hasChrome = opts.chrome !== false;

    const wa = getWorkarea();
    const w = Math.min(opts.width || app.width || 780, wa.width - 60);
    const h = Math.min(opts.height || app.height || 540, wa.height - 40);
    const offset = (cascade++ % 6) * 26;
    const x = opts.x ?? Math.max(12, Math.min(wa.width - w - 12, (wa.width - w) / 2 + offset - 60));
    const y = opts.y ?? Math.max(wa.y + 8, Math.min(wa.y + wa.height - h - 24, wa.y + 38 + offset));

    this.el = document.createElement('div');
    this.el.className = `win opening${this.hasChrome ? '' : ' no-chrome'}`;
    this.el.dataset.id = this.id;
    this.el.dataset.app = app.id;
    this.el.style.cssText = `left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(w)}px;height:${Math.round(h)}px;z-index:${++zTop}`;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', app.name || 'Window');

    this.el.innerHTML = `
      <div class="win-chrome">
        <div class="traffic">
          <button class="tl close" title="Close" aria-label="Close">${glyph('close', 7, 3)}</button>
          <button class="tl min" title="Minimize" aria-label="Minimize">${glyph('minus', 7, 3)}</button>
          <button class="tl max" title="Zoom" aria-label="Zoom">${glyph('plus', 7, 3)}</button>
        </div>
        <div class="win-title">${opts.title || app.name || ''}</div>
        <div class="win-toolbar"></div>
      </div>
      <div class="win-body"></div>
      <div class="rz rz-n" data-dir="n"></div><div class="rz rz-s" data-dir="s"></div>
      <div class="rz rz-e" data-dir="e"></div><div class="rz rz-w" data-dir="w"></div>
      <div class="rz rz-ne" data-dir="ne"></div><div class="rz rz-nw" data-dir="nw"></div>
      <div class="rz rz-se" data-dir="se"></div><div class="rz rz-sw" data-dir="sw"></div>
      <div class="win-sheet"></div>`;

    this.chrome = $('.win-chrome', this.el);
    this.titleEl = $('.win-title', this.el);
    this.toolbar = $('.win-toolbar', this.el);
    this.body = $('.win-body', this.el);
    this.sheet = $('.win-sheet', this.el);

    this.bindChrome();
    $('#windows').appendChild(this.el);
    wins.set(this.id, this);

    setTimeout(() => this.el.classList.remove('opening'), 260);

    if (app.mount) {
      try {
        const ret = app.mount({
          root: this.body,
          win: this,
          toolbar: this.toolbar,
          args: this.args,
          setTitle: (t) => this.setTitle(t),
          setToolbar: (html) => this.setToolbar(html),
          onClose: (fn) => this.onClose(fn),
          close: () => this.close(),
        });
        if (typeof ret === 'function') this.cleanupFns.push(ret);
      } catch (err) {
        console.error(`[CanopyOS] ${app.id} failed to mount`, err);
        this.body.innerHTML = `<div class="empty-state">${glyph('warning', 38)}<div><b>${app.name} crashed</b><br><span class="tiny">${String(err.message || err)}</span></div></div>`;
      }
    }
    wm.focus(this);
    window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'open', win: this } }));
  }

  bindChrome() {
    const closeBtn = $('.tl.close', this.el);
    const minBtn = $('.tl.min', this.el);
    const maxBtn = $('.tl.max', this.el);
    closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    minBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
    maxBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });

    this.el.addEventListener('pointerdown', () => wm.focus(this), true);

    // dragging
    this.chrome.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button, input, select, textarea, a, .no-drag, .tl')) return;
      this.startDrag(e);
    });
    this.chrome.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, .no-drag')) return;
      this.toggleMaximize();
    });

    this.el.querySelectorAll('.rz').forEach((h) => {
      h.addEventListener('pointerdown', (e) => { if (e.button === 0) this.startResize(e, h.dataset.dir); });
    });
  }

  setTitle(t) {
    this.titleEl.textContent = t;
    this.el.setAttribute('aria-label', t);
  }

  setToolbar(html) { this.toolbar.innerHTML = html; }

  onClose(fn) { this.closeFns.push(fn); }

  startDrag(e) {
    const wasMax = this.maximized;
    if (wasMax) {
      const rect = this.el.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      this.toggleMaximize(false);
      const nr = this.el.getBoundingClientRect();
      this.el.style.left = `${e.clientX - nr.width * ratio}px`;
      this.el.style.top = `${Math.max(getWorkarea().y, e.clientY - 18)}px`;
    }
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = this.el.getBoundingClientRect();
    const left = rect.left;
    const top = rect.top;
    let zone = null;
    this.el.classList.add('dragging');
    wm.focus(this);
    const preview = $('#snap-preview');

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const wa = getWorkarea();
      let nl = left + dx;
      let nt = top + dy;
      nt = Math.max(wa.y, Math.min(window.innerHeight - 40, nt));
      nl = Math.max(-rect.width + 90, Math.min(window.innerWidth - 90, nl));
      this.el.style.left = `${nl}px`;
      this.el.style.top = `${nt}px`;
      this.snapped = null;

      const margin = 16;
      let nz = null;
      let box = null;
      if (ev.clientX <= margin) { nz = 'left'; box = { left: 0, top: wa.y, width: wa.width / 2, height: wa.height }; }
      else if (ev.clientX >= window.innerWidth - margin) { nz = 'right'; box = { left: wa.width / 2, top: wa.y, width: wa.width / 2, height: wa.height }; }
      else if (ev.clientY <= wa.y + 6) { nz = 'top'; box = { left: 0, top: wa.y, width: wa.width, height: wa.height }; }
      if (nz !== zone) {
        zone = nz;
        if (box) {
          preview.hidden = false;
          preview.style.left = `${box.left}px`;
          preview.style.top = `${box.top}px`;
          preview.style.width = `${box.width}px`;
          preview.style.height = `${box.height}px`;
        } else preview.hidden = true;
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      this.el.classList.remove('dragging');
      preview.hidden = true;
      if (zone === 'left') this.snap('left');
      else if (zone === 'right') this.snap('right');
      else if (zone === 'top') this.toggleMaximize(true);
      else {
        // keep window fully on screen
        const r = this.el.getBoundingClientRect();
        if (r.top < getWorkarea().y) this.el.style.top = `${getWorkarea().y}px`;
        if (r.left > window.innerWidth - 120) this.el.style.left = `${window.innerWidth - 120}px`;
        if (r.right < 120) this.el.style.left = `${120 - r.width}px`;
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up, { once: true });
  }

  startResize(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    if (this.maximized) return;
    wm.focus(this);
    const rect = this.el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    this.el.classList.add('dragging');
    const minW = Math.max(320, this.app.minWidth || 320);
    const minH = Math.max(180, this.app.minHeight || 180);
    const wa = getWorkarea();
    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      let { left, top, width, height } = start;
      if (dir.includes('e')) width = Math.max(minW, start.width + dx);
      if (dir.includes('s')) height = Math.max(minH, start.height + dy);
      if (dir.includes('w')) { width = Math.max(minW, start.width - dx); left = start.left + (start.width - width); }
      if (dir.includes('n')) { height = Math.max(minH, start.height - dy); top = Math.max(wa.y, start.top + (start.height - height)); height = start.top + start.height - top; }
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      this.el.style.width = `${width}px`;
      this.el.style.height = `${height}px`;
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      this.el.classList.remove('dragging');
      this.snapped = null;
      this.el.dispatchEvent(new CustomEvent('canopy:resize'));
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up, { once: true });
  }

  snap(side) {
    const wa = getWorkarea();
    this.prevRect = this.getRect();
    this.maximized = false;
    this.el.classList.remove('maximized');
    this.el.classList.add('snapping');
    if (side === 'left') { this.setRect({ x: 0, y: wa.y, w: wa.width / 2, h: wa.height }); this.snapped = 'left'; }
    if (side === 'right') { this.setRect({ x: wa.width / 2, y: wa.y, w: wa.width / 2, h: wa.height }); this.snapped = 'right'; }
    this.el.style.borderRadius = 'var(--radius-win)';
    setTimeout(() => this.el.classList.remove('snapping'), 220);
    sound.play('snap');
    window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'snap', win: this } }));
    this.el.dispatchEvent(new CustomEvent('canopy:resize'));
  }

  toggleMaximize(force) {
    const next = typeof force === 'boolean' ? force : !this.maximized;
    if (next === this.maximized) return;
    this.el.classList.add('snapping');
    if (next) {
      this.prevRect = this.getRect();
      const wa = getWorkarea();
      this.el.classList.add('maximized');
      this.setRect({ x: 0, y: wa.y, w: wa.width, h: wa.height });
      this.maximized = true;
    } else {
      this.el.classList.remove('maximized');
      const r = this.prevRect || { x: 80, y: 80, w: this.app.width || 760, h: this.app.height || 520 };
      this.setRect({ x: r.x, y: r.y, w: r.w, h: r.h });
      this.maximized = false;
    }
    this.snapped = null;
    setTimeout(() => this.el.classList.remove('snapping'), 220);
    this.el.dispatchEvent(new CustomEvent('canopy:resize'));
  }

  setRect({ x, y, w, h }) {
    this.el.style.left = `${Math.round(x)}px`;
    this.el.style.top = `${Math.round(y)}px`;
    this.el.style.width = `${Math.round(w)}px`;
    this.el.style.height = `${Math.round(h)}px`;
  }

  getRect() {
    return {
      x: parseFloat(this.el.style.left) || 0,
      y: parseFloat(this.el.style.top) || 0,
      w: parseFloat(this.el.style.width) || this.el.offsetWidth,
      h: parseFloat(this.el.style.height) || this.el.offsetHeight,
    };
  }

  minimize() {
    if (this.minimized) return;
    this.minimized = true;
    this.el.classList.add('minimized');
    sound.play('minimize');
    if (focusedId === this.id) {
      const next = [...wins.values()].filter((w) => !w.minimized && w.space === this.space).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
      focusedId = null;
      if (next) wm.focus(next);
      else window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'blur', win: this } }));
    }
    window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'minimize', win: this } }));
  }

  restore() {
    this.minimized = false;
    this.el.classList.remove('minimized');
    if (this.space !== wm.currentSpace) wm.setSpace(this.space);
    wm.focus(this);
    window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'restore', win: this } }));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.closeFns.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    this.cleanupFns.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    this.el.classList.add('closing');
    sound.play('close');
    setTimeout(() => this.el.remove(), 200);
    wins.delete(this.id);
    if (focusedId === this.id) {
      focusedId = null;
      const next = [...wins.values()].filter((w) => !w.minimized && w.space === wm.currentSpace).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
      if (next) wm.focus(next);
      else window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'blur', win: this } }));
    }
    window.dispatchEvent(new CustomEvent('canopy:win', { detail: { action: 'close', win: this } }));
  }

  setSpace(n) {
    this.space = n;
    this.el.classList.toggle('active-space', n === wm.currentSpace);
  }
}

export const wm = {
  currentSpace: 0,
  spaces: 3,
  wins,
  registry,

  open(appId, opts = {}) {
    const app = registry.get(appId);
    if (!app) {
      console.warn(`[CanopyOS] Unknown app: ${appId}`);
      return null;
    }
    if (app.singleton) {
      const existing = [...wins.values()].find((w) => w.appId === appId);
      if (existing) {
        if (existing.minimized) existing.restore();
        else { wm.focus(existing); if (existing.space !== wm.currentSpace) wm.setSpace(existing.space); }
        if (opts.args && app.acceptArgs) {
          try { existing.app.onArgs?.(existing, opts.args); } catch (e) { /* noop */ }
        }
        return existing;
      }
    }
    const win = new Win(app, opts);
    sound.play('open');
    return win;
  },

  focus(win) {
    if (!win || win.closed) return;
    if (win.minimized) return;
    if (focusedId === win.id) {
      win.el.style.zIndex = String(++zTop);
      return;
    }
    focusedId = win.id;
    win.el.style.zIndex = String(++zTop);
    [...wins.values()].forEach((w) => w.el.classList.toggle('inactive', w.id !== win.id));
    if (win.space !== wm.currentSpace) wm.setSpace(win.space);
    window.dispatchEvent(new CustomEvent('canopy:focus', { detail: win }));
  },

  focused() { return focusedId ? wins.get(focusedId) : null; },

  close(id) { wins.get(id)?.close(); },
  closeApp(appId) { [...wins.values()].filter((w) => w.appId === appId).forEach((w) => w.close()); },
  closeAll() { [...wins.values()].forEach((w) => w.close()); },
  minimizeAll() { [...wins.values()].forEach((w) => w.minimize()); },
  byApp(appId) { return [...wins.values()].filter((w) => w.appId === appId); },

  tile() {
    const active = [...wins.values()].filter((w) => !w.minimized && w.space === wm.currentSpace);
    const wa = getWorkarea();
    if (!active.length) return;
    const cols = Math.ceil(Math.sqrt(active.length));
    const rows = Math.ceil(active.length / cols);
    const gap = 8;
    const cw = (wa.width - gap * (cols + 1)) / cols;
    const ch = (wa.height - gap * (rows + 1)) / rows;
    active.forEach((w, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      w.el.classList.remove('maximized');
      w.el.classList.add('snapping');
      w.setRect({ x: gap + c * (cw + gap), y: wa.y + gap + r * (ch + gap), w: cw, h: ch });
      w.maximized = false;
      w.snapped = 'tile';
      setTimeout(() => w.el.classList.remove('snapping'), 220);
      w.el.dispatchEvent(new CustomEvent('canopy:resize'));
    });
    sound.play('snap');
  },

  setSpace(n) {
    const count = store.get('spaces', 3);
    this.spaces = count;
    this.currentSpace = Math.max(0, Math.min(count - 1, n));
    [...wins.values()].forEach((w) => w.el.classList.toggle('active-space', w.space === this.currentSpace));
    window.dispatchEvent(new CustomEvent('canopy:space', { detail: { space: this.currentSpace } }));
  },

  addSpace() {
    const count = store.get('spaces', 3) + 1;
    store.set('spaces', count);
    this.spaces = count;
    window.dispatchEvent(new CustomEvent('canopy:space', { detail: { space: this.currentSpace } }));
  },

  removeSpace(i) {
    const count = store.get('spaces', 3);
    if (count <= 1) return;
    [...wins.values()].filter((w) => w.space === i).forEach((w) => w.close());
    [...wins.values()].forEach((w) => { if (w.space > i) w.space--; });
    store.set('spaces', count - 1);
    this.setSpace(Math.min(this.currentSpace, count - 2));
  },

  cycle(dir = 1) {
    const wa = getWorkarea();
    const active = [...wins.values()].filter((w) => !w.minimized && w.space === wm.currentSpace).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));
    if (active.length < 2) return;
    const idx = (active.indexOf(wm.focused()) + dir + active.length) % active.length;
    const target = active[idx];
    target.el.style.left = `${Math.max(40, Math.min(wa.width - 200, parseFloat(target.el.style.left) + 70))}px`;
    wm.focus(target);
  },

  appMenu() {
    const win = wm.focused();
    const app = win ? registry.get(win.appId) : null;
    return { app, win };
  },
};

export function appIconFor(app) {
  return appIcon(app.icon || 'file', app.colors, app.iconOpts);
}

export { Win };
