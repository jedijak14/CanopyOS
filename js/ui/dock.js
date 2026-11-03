/* CanopyOS — Dock with live magnification, badges, context menus */
import { store } from '../core/store.js';
import { wm, getApp, appIconFor } from '../core/wm.js';
import { fs } from '../core/fs.js';
import { data } from '../core/data.js';
import { appIcon } from '../core/icons.js';
import { sound } from '../core/sound.js';
import { showMenuAt } from './menu.js';
import { toggleLaunchpad } from './launchpad.js';
import { confirmModal } from './modal.js';

const shell = () => document.getElementById('dock-shell');
let dockEl = null;

const SPECIALS = {
  launchpad: { name: 'Launchpad', icon: () => appIcon('grid', ['#a9b3c1', '#5b6472']), action: () => toggleLaunchpad() },
  trash: { name: 'Trash', icon: () => appIcon('trash', ['#b7c0cc', '#68727f']), action: () => wm.open('finder', { args: { path: '/Trash' } }) },
};

function badgeFor(appId) {
  if (appId === 'mail') {
    const n = data.get('mail', []).filter((m) => m.folder === 'inbox' && m.unread).length;
    return n || 0;
  }
  if (appId === 'messages') {
    return data.get('messages', []).reduce((sum, t) => sum + (t.unread || 0), 0);
  }
  if (appId === 'reminders') {
    return data.get('reminders', []).filter((r) => !r.done && r.due === new Date().toISOString().slice(0, 10)).length;
  }
  return 0;
}

export function renderDock() {
  const s = shell();
  if (!s) return;
  const pinned = store.get('dockPinned', []);
  const running = [...new Set(wm.wins.size ? [...wm.wins.values()].map((w) => w.appId) : [])];
  const extras = running.filter((id) => !pinned.includes(id) && getApp(id));
  const trashCount = fs.stat('/Trash')?.children.length || 0;

  const item = (id, special = false) => {
    const app = special ? SPECIALS[id] : getApp(id);
    if (!app) return '';
    const wins = special ? [] : wm.byApp(id);
    const isRunning = wins.length > 0;
    const allMin = isRunning && wins.every((w) => w.minimized);
    const badge = special ? (id === 'trash' ? trashCount : 0) : badgeFor(id);
    return `<div class="dock-item ${isRunning ? 'running' : ''} ${allMin ? 'minimized' : ''}" data-app="${id}" data-special="${special}">
      <span class="dock-label">${app.name || app.title || id}</span>
      <button class="dock-icon-btn" aria-label="${app.name || id}">${typeof app.icon === 'function' ? app.icon() : appIconFor(app)}</button>
      ${badge ? `<span class="dock-badge">${badge > 99 ? '99+' : badge}</span>` : ''}
      <span class="dock-dot"></span>
    </div>`;
  };

  const html = [
    pinned.map((id) => item(id, !!SPECIALS[id])).join(''),
    extras.length ? '<div class="dock-sep"></div>' : '',
    extras.map((id) => item(id)).join(''),
    '<div class="dock-sep"></div>',
    item('trash', true),
  ].join('');

  s.innerHTML = `<div class="dock" role="toolbar" aria-label="Dock">${html}</div>`;
  dockEl = s.querySelector('.dock');

  dockEl.querySelectorAll('.dock-item').forEach((el) => {
    const id = el.dataset.app;
    const special = el.dataset.special === 'true';
    el.querySelector('.dock-icon-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      sound.unlockAudio();
      const app = special ? SPECIALS[id] : getApp(id);
      if (!app) return;
      if (special) { app.action(); return; }
      const wins = wm.byApp(id);
      if (!wins.length) {
        bounce(id);
        wm.open(id);
      } else {
        const min = wins.filter((w) => w.minimized);
        if (min.length === wins.length) min[min.length - 1].restore();
        else {
          const top = wins.find((w) => !w.minimized);
          if (top) { if (top.space !== wm.currentSpace) wm.setSpace(top.space); wm.focus(top); }
        }
      }
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDockMenu(id, special, e.clientX, e.clientY);
    });
  });

  if (store.get('dockMagnify')) {
    dockEl.addEventListener('pointermove', magnify);
    dockEl.addEventListener('pointerleave', resetMagnify);
  }
}

function magnify(e) {
  if (!dockEl) return;
  const items = [...dockEl.querySelectorAll('.dock-item')];
  const vertical = store.get('dockPosition') !== 'bottom';
  const pos = vertical ? e.clientY : e.clientX;
  const radius = 150;
  items.forEach((it) => {
    const r = it.getBoundingClientRect();
    const center = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
    const d = Math.abs(center - pos);
    const btn = it.querySelector('.dock-icon-btn');
    if (!btn) return;
    if (d < radius) {
      const t = 1 - d / radius;
      const scale = 1 + 0.42 * Math.pow(Math.cos((t * Math.PI) / 2), 2);
      btn.style.transform = `scale(${scale.toFixed(3)}) translateY(${(-(scale - 1) * 12).toFixed(1)}px)`;
      btn.style.zIndex = String(Math.round(scale * 10));
    } else {
      btn.style.transform = '';
      btn.style.zIndex = '';
    }
  });
}

function resetMagnify() {
  if (!dockEl) return;
  dockEl.querySelectorAll('.dock-icon-btn').forEach((b) => { b.style.transform = ''; b.style.zIndex = ''; });
}

function openDockMenu(id, special, x, y) {
  const app = special ? SPECIALS[id] : getApp(id);
  if (!app) return;
  const pinned = store.get('dockPinned', []);
  const items = [
    { label: 'Open', action: () => (special ? app.action() : wm.open(id)) },
  ];
  if (!special) {
    items.push({ label: 'New Window', action: () => wm.open(id) });
    items.push({ sep: true });
    items.push({ label: 'Show in Finder', action: () => wm.open('finder', { args: { path: '/Applications' } }) });
    items.push({
      label: pinned.includes(id) ? 'Remove from Dock' : 'Keep in Dock',
      action: () => {
        const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
        store.set('dockPinned', next);
        renderDock();
      },
    });
    items.push({ sep: true });
    items.push({ label: wm.byApp(id).length ? 'Quit' : 'Not Running', disabled: !wm.byApp(id).length, action: () => wm.closeApp(id) });
  } else if (id === 'trash') {
    items.push({ sep: true });
    items.push({ label: 'Empty Trash…', disabled: !(fs.stat('/Trash')?.children.length), action: async () => {
      const ok = await confirmModal({ title: 'Empty Trash?', body: 'Items in the Trash will be permanently deleted.', okLabel: 'Empty Trash' });
      if (ok) { fs.emptyTrash(); sound.play('trash'); renderDock(); }
    } });
  }
  showMenuAt(x, y - 8, items, { flipTop: true });
}

export function bounce(appId) {
  const el = document.querySelector(`.dock-item[data-app="${appId}"]`);
  if (!el) return;
  el.classList.add('bouncing');
  setTimeout(() => el.classList.remove('bouncing'), 1300);
}

export function initDock() {
  renderDock();
  window.addEventListener('canopy:win', renderDock);
  window.addEventListener('canopy:data', renderDock);
  window.addEventListener('canopy:fs', renderDock);
  window.addEventListener('canopy:setting', (e) => {
    if (/dock|dockPinned|theme/.test(e.detail?.key || '')) renderDock();
  });
  // autohide peek strip
  document.addEventListener('pointermove', (e) => {
    if (!store.get('dockAutohide') || !dockEl) return;
    const near = e.clientY > window.innerHeight - 10;
    dockEl.classList.toggle('peek', near);
  });
}

export function setDockBadge() { renderDock(); }
