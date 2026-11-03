/* CanopyOS — desktop widgets */
import { store } from '../core/store.js';
import { data } from '../core/data.js';
import { wm } from '../core/wm.js';
import { glyph } from '../core/icons.js';
import { getWeather, CONDITIONS } from '../core/weather.js';
import { fmtTime, fmtDate, monthName, daysInMonth, escapeHtml } from '../core/util.js';

const root = () => document.getElementById('widgets');
let clockTimer = null;

function open(appId, args) {
  return (e) => { e.stopPropagation(); wm.open(appId, args ? { args } : undefined); };
}

function clockWidget() {
  const now = new Date();
  return `<div class="widget" data-widget="clock" role="button" tabindex="0" title="Open Clock">
    <div class="w-big" data-w-time>${fmtTime(now, { h24: store.get('clock24') })}</div>
    <div class="w-sub">${fmtDate(now, { year: true })}</div>
  </div>`;
}

function weatherWidget() {
  const w = getWeather(data.get('weatherCity', 'San Diego'));
  const days = w.daily.slice(1, 4);
  return `<div class="widget" data-widget="weather" role="button" tabindex="0" title="Open Weather">
    <h4>${w.city.name}</h4>
    <div class="w-row">
      <div>
        <div class="w-big">${w.temp}°</div>
        <div class="w-sub">${w.condition.label} · H:${w.high}° L:${w.low}°</div>
      </div>
      <div style="opacity:.9">${glyph(w.condition.icon, 40, 1.4)}</div>
    </div>
    <div class="w-days">${days.map((d) => `<div class="w-day"><span>${d.label}</span>${glyph(CONDITIONS[d.cond].icon, 16, 1.8)}<b>${d.high}°</b></div>`).join('')}</div>
  </div>`;
}

function calendarWidget() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const total = daysInMonth(now.getFullYear(), now.getMonth());
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<span class="wc-d dim">${daysInMonth(now.getFullYear(), now.getMonth() - 1) - first + i + 1}</span>`);
  for (let d = 1; d <= total; d++) cells.push(`<span class="wc-d ${d === now.getDate() ? 'today' : ''}">${d}</span>`);
  while (cells.length % 7 !== 0) cells.push('<span></span>');
  return `<div class="widget" data-widget="calendar" role="button" tabindex="0" title="Open Calendar">
    <h4>${monthName(now.getMonth())} ${now.getFullYear()}</h4>
    <div class="w-cal">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="wc-h">${d}</span>`).join('')}${cells.join('')}</div>
  </div>`;
}

function notesWidget() {
  const notes = data.get('notes', []);
  const note = notes.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned))[0];
  if (!note) return '';
  return `<div class="widget" data-widget="notes" role="button" tabindex="0" title="Open Notes">
    <h4>Note</h4>
    <div style="font-size:12.5px;font-weight:600;margin-bottom:4px">${escapeHtml(note.title)}</div>
    <div class="w-note">${escapeHtml(note.body.replace(/[#>*`-]/g, '').slice(0, 150))}</div>
  </div>`;
}

function remindersWidget() {
  const items = data.get('reminders', []).filter((r) => !r.done).slice(0, 4);
  return `<div class="widget" data-widget="reminders" role="button" tabindex="0" title="Open Reminders">
    <h4>Reminders</h4>
    <div class="w-list">${items.length ? items.map((r) => `<label data-rem="${r.id}"><input type="checkbox" data-rem-check="${r.id}"><span>${escapeHtml(r.title)}</span></label>`).join('') : '<div class="w-sub">All caught up 🌿</div>'}</div>
  </div>`;
}

function batteryWidget() {
  const now = new Date();
  const stats = JSON.parse(localStorage.getItem('canopy.stats') || '{}');
  const energy = stats.energy || 82;
  return `<div class="widget" data-widget="battery" role="button" tabindex="0" title="Open Activity Monitor">
    <h4>System</h4>
    <div class="w-row"><div><div class="w-big" style="font-size:26px">${energy}%</div><div class="w-sub">Battery · ${store.get('wifi') ? 'Wi-Fi on' : 'Offline'}</div></div>
    <div class="w-bars">${Array.from({ length: 8 }, (_, i) => `<span class="${i < Math.round(energy / 12.5) ? 'now' : ''}" style="height:${30 + i * 6}%"></span>`).join('')}</div></div>
  </div>`;
}

export function renderWidgets() {
  const el = root();
  if (!el) return;
  if (!store.get('widgets')) { el.innerHTML = ''; return; }
  el.innerHTML = [clockWidget(), weatherWidget(), calendarWidget(), notesWidget(), remindersWidget(), batteryWidget()].join('');
  el.querySelectorAll('[data-widget]').forEach((w) => {
    const id = w.dataset.widget;
    const map = { clock: 'clock', weather: 'weather', calendar: 'calendar', notes: 'notes', reminders: 'reminders', battery: 'activity' };
    w.addEventListener('dblclick', open(map[id]));
    w.addEventListener('click', (e) => {
      if (e.target.closest('[data-rem-check]')) return;
      if (e.detail === 1) return; // single click reserved for checkbox interactions
    });
    w.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(map[id])(e); });
  });
  el.querySelectorAll('[data-rem-check]').forEach((cb) => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cb.dataset.remCheck;
      const list = data.get('reminders', []).map((r) => (r.id === id ? { ...r, done: true } : r));
      data.set('reminders', list);
      import('../core/sound.js').then(({ sound }) => sound.play('success'));
    });
  });
}

export function initWidgets() {
  renderWidgets();
  data.subscribe('reminders', renderWidgets);
  data.subscribe('notes', renderWidgets);
  data.subscribe('weatherCity', renderWidgets);
  window.addEventListener('canopy:setting', (e) => {
    if (/widgets|clock24|theme|wifi/.test(e.detail?.key || '')) renderWidgets();
  });
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const t = document.querySelector('[data-w-time]');
    if (t) t.textContent = fmtTime(new Date(), { h24: store.get('clock24') });
  }, 1000);
}
