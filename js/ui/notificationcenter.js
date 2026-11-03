/* CanopyOS — Notification Center + Focus modes */
import { store } from '../core/store.js';
import { data } from '../core/data.js';
import { notify } from '../core/notify.js';
import { wm } from '../core/wm.js';
import { appIcon, glyph } from '../core/icons.js';
import { sound } from '../core/sound.js';
import { getWeather } from '../core/weather.js';
import { relTime, fmtDate } from '../core/util.js';

const el = () => document.getElementById('notification-center');
let open = false;

const FOCUS = [
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'personal', label: 'Personal', icon: 'user' },
  { id: 'sleep', label: 'Sleep', icon: 'moon' },
];

function render() {
  const c = el();
  if (!c) return;
  const items = notify.items();
  const w = getWeather(data.get('weatherCity', 'San Diego'));
  const focus = store.get('focusMode');

  c.innerHTML = `
    <div class="nc-card">
      <div class="nc-head"><h3>${focus === 'off' ? 'Notifications' : 'Focus · ' + focus}</h3>
        <button data-nc="clear">${items.length ? 'Clear All' : 'No new items'}</button></div>
      <div class="cc-mini" style="margin-bottom:10px">
        ${FOCUS.map((f) => `<button class="cc-chip ${focus === f.id ? 'on' : ''}" data-focus="${f.id}">${glyph(f.icon, 12)} ${f.label}</button>`).join('')}
        <button class="cc-chip ${focus === 'off' ? 'on' : ''}" data-focus="off">Off</button>
      </div>
      <div class="nc-list">
        ${items.length ? items.map((n) => `<div class="nc-item" data-nc-item="${n.id}" ${n.appId ? `data-app="${n.appId}"` : ''}>
          <div class="nc-art">${appIcon(n.icon || 'bell', n.colors || ['#5b6b82', '#2a3444'])}</div>
          <div class="nc-body"><div style="display:flex;justify-content:space-between;gap:8px"><b>${n.title}</b><time>${relTime(n.ts)}</time></div><p>${n.body || ''}</p></div>
        </div>`).join('') : `<div class="nc-empty">No notifications.<br><span class="tiny">You're all caught up 🌿</span></div>`}
      </div>
    </div>
    <div class="nc-card">
      <div class="nc-head"><h3>Today</h3><span class="tiny muted">${fmtDate(new Date())}</span></div>
      <div class="nc-widgets">
        <div class="widget" style="background:linear-gradient(150deg,#2f6fed,#0a3d91)">
          <h4>Weather</h4>
          <div class="w-row"><div><div class="w-big" style="font-size:26px">${w.temp}°</div><div class="w-sub">${w.city.name}</div></div>${glyph(w.condition.icon, 28, 1.6)}</div>
        </div>
        <div class="widget" style="background:linear-gradient(150deg,#8e5cf7,#4c1d95)">
          <h4>${new Date().toLocaleDateString('en-US', { weekday: 'long' })}</h4>
          <div class="w-big" style="font-size:26px">${new Date().getDate()}</div>
          <div class="w-sub">${data.get('events', []).filter((e) => e.date === new Date().toISOString().slice(0, 10)).length} events today</div>
        </div>
      </div>
    </div>`;

  c.querySelector('[data-nc="clear"]')?.addEventListener('click', (e) => { e.stopPropagation(); notify.clear(); render(); });
  c.querySelectorAll('[data-focus]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const f = btn.dataset.focus;
      store.set('focusMode', f);
      store.set('dnd', f !== 'off');
      sound.play('toggle');
      render();
    });
  });
  c.querySelectorAll('[data-nc-item]').forEach((item) => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.dataset.ncItem;
      notify.remove(id);
      if (item.dataset.app) wm.open(item.dataset.app);
      render();
    });
  });
}

export function openNotificationCenter() {
  const c = el();
  if (!c) return;
  render();
  c.hidden = false;
  open = true;
  document.getElementById('mb-clock')?.classList.add('open');
  notify.markAllRead();
}

export function closeNotificationCenter() {
  const c = el();
  if (!c || c.hidden) return;
  c.hidden = true;
  open = false;
  document.getElementById('mb-clock')?.classList.remove('open');
}

export function toggleNotificationCenter() {
  if (!el().hidden) closeNotificationCenter();
  else openNotificationCenter();
}

document.addEventListener('pointerdown', (e) => {
  if (!open) return;
  if (e.target.closest('#notification-center, #mb-clock, #toasts')) return;
  closeNotificationCenter();
}, true);

window.addEventListener('canopy:notify', () => { if (open) render(); });
window.addEventListener('canopy:setting', (e) => { if (open && /dnd|focusMode/.test(e.detail?.key || '')) render(); });
