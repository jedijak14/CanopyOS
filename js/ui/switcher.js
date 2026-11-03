/* CanopyOS — ⌘Tab application switcher */
import { wm, getApp, allApps } from '../core/wm.js';
import { appIcon } from '../core/icons.js';
import { store } from '../core/store.js';

let isOpen = false;
let index = 0;
let list = [];

function render() {
  const c = document.getElementById('switcher');
  if (!c) return;
  c.innerHTML = `<div class="sw-box" role="dialog" aria-label="Application switcher">
    ${list.map((app, i) => `<div class="sw-app ${i === index ? 'sel' : ''}" data-i="${i}">${appIcon(app.icon, app.colors, app.iconOpts)}<span>${app.name}</span></div>`).join('')}
  </div>`;
  c.querySelectorAll('.sw-app').forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      index = Number(el.dataset.i);
      commit();
    });
  });
}

export function openSwitcher() {
  const c = document.getElementById('switcher');
  if (!c) return;
  if (isOpen) { cycle(1); return; }
  const running = [...new Set([...wm.wins.values()].map((w) => w.appId))].map((id) => getApp(id)).filter(Boolean);
  list = running.length ? running : store.get('dockPinned', []).map((id) => getApp(id)).filter(Boolean).slice(0, 8);
  if (!list.length) list = allApps().slice(0, 8);
  isOpen = true;
  index = 1 % list.length;
  c.hidden = false;
  render();
}

export function cycle(dir) {
  if (!isOpen) return;
  index = (index + dir + list.length) % list.length;
  render();
}

export function commit() {
  if (!isOpen) return;
  const app = list[index];
  close();
  if (app) wm.open(app.id);
}

export function cancel() { close(); }

function close() {
  const c = document.getElementById('switcher');
  isOpen = false;
  if (c) { c.hidden = true; c.innerHTML = ''; }
}

export function isSwitcherOpen() { return isOpen; }
