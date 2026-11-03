/* CanopyOS — notifications: banner toasts + Notification Center history */
import { store } from './store.js';
import { sound } from './sound.js';
import { appIcon, glyph } from './icons.js';
import { uid, relTime } from './util.js';

const toastRoot = () => document.getElementById('toasts');

function renderToast(item) {
  const root = toastRoot();
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="t-art">${item.icon ? appIcon(item.icon, item.colors || ['#5b6b82', '#2a3444']) : glyph('bell', 30, 1.6)}</div>
    <div class="t-body">
      <div class="t-title">${item.title}</div>
      ${item.body ? `<div class="t-text">${item.body}</div>` : ''}
    </div>
    <button class="t-x" aria-label="Dismiss">✕</button>`;
  const dismiss = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector('.t-x').addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  if (item.appId) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.t-x')) return;
      import('../core/wm.js').then(({ wm }) => wm.open(item.appId));
      dismiss();
    });
  }
  root.appendChild(el);
  const ttl = item.ttl || 5600;
  if (ttl > 0) setTimeout(dismiss, ttl);
  while (root.children.length > 4) root.firstChild.remove();
}

export const notify = {
  items() { return store.get('notifications') || []; },

  post({ title = 'Notification', body = '', app = 'CanopyOS', appId = null, icon = 'bell', colors = null, silent = false, ttl = 5600 } = {}) {
    const item = { id: uid('n'), title, body, app, appId, icon, colors, ts: Date.now(), read: false };
    const list = [item, ...this.items()].slice(0, 40);
    store.set('notifications', list, { silent: true });
    if (!store.get('dnd') && !silent) {
      renderToast(item);
      sound.play('notify');
    }
    window.dispatchEvent(new CustomEvent('canopy:notify', { detail: item }));
    return item;
  },

  remove(id) {
    store.set('notifications', this.items().filter((n) => n.id !== id), { silent: true });
    window.dispatchEvent(new CustomEvent('canopy:notify', { detail: null }));
  },

  clear() {
    store.set('notifications', [], { silent: true });
    window.dispatchEvent(new CustomEvent('canopy:notify', { detail: null }));
  },

  unread() { return this.items().filter((n) => !n.read).length; },

  markAllRead() {
    const list = this.items().map((n) => ({ ...n, read: true }));
    store.set('notifications', list, { silent: true });
    window.dispatchEvent(new CustomEvent('canopy:notify', { detail: null }));
  },

  timeLabel(ts) { return relTime(ts); },
};
