/* CanopyOS — Clock: world clock, alarms, stopwatch and timers */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, fmtTime, uid } from '../core/util.js';
import { notify } from '../core/notify.js';
import { promptModal } from '../ui/modal.js';

const ZONES = [
  ['America/Los_Angeles', 'Cupertino'], ['America/New_York', 'New York'], ['America/Chicago', 'Chicago'],
  ['America/Sao_Paulo', 'São Paulo'], ['Europe/London', 'London'], ['Europe/Paris', 'Paris'],
  ['Europe/Berlin', 'Berlin'], ['Africa/Cairo', 'Cairo'], ['Africa/Johannesburg', 'Cape Town'],
  ['Asia/Dubai', 'Dubai'], ['Asia/Kolkata', 'Mumbai'], ['Asia/Shanghai', 'Shanghai'],
  ['Asia/Tokyo', 'Tokyo'], ['Asia/Seoul', 'Seoul'], ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'], ['UTC', 'UTC'],
];

export default {
  id: 'clock',
  name: 'Clock',
  icon: 'clock',
  colors: ['#3a3f4b', '#0f1319'],
  width: 820, height: 580,
  keywords: ['time', 'alarm', 'timer', 'stopwatch', 'world clock'],
  menus: (win) => [
    { label: 'View', items: [
      { label: 'World Clock', action: () => win?._tab('world') },
      { label: 'Alarms', action: () => win?._tab('alarms') },
      { label: 'Stopwatch', action: () => win?._tab('stopwatch') },
      { label: 'Timers', action: () => win?._tab('timers') },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let tab = 'world';
    let zones = data.get('worldClocks', ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Tokyo']);
    let alarms = data.get('alarms', []);
    let ticking = [];
    let stopwatch = { running: false, start: 0, elapsed: 0, laps: [] };
    let timers = [];
    let swInterval = null;
    let clockInterval = null;

    root.innerHTML = `<div class="clockapp">
      <aside class="clock-side">
        <button class="clock-nav active" data-tab="world">${glyph('globe', 15, 1.8)} World Clock</button>
        <button class="clock-nav" data-tab="alarms">${glyph('alarm', 15, 1.8)} Alarms</button>
        <button class="clock-nav" data-tab="stopwatch">${glyph('stopwatch', 15, 1.8)} Stopwatch</button>
        <button class="clock-nav" data-tab="timers">${glyph('timer', 15, 1.8)} Timers</button>
      </aside>
      <section class="clock-main scroll-thin" data-main></section>
    </div>`;

    const main = root.querySelector('[data-main]');

    function analog(date, tz, size = 88) {
      let h; let m; let s;
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(date);
        h = Number(parts.find((p) => p.type === 'hour').value) % 12;
        m = Number(parts.find((p) => p.type === 'minute').value);
        s = Number(parts.find((p) => p.type === 'second').value);
      } catch (e) { h = date.getHours() % 12; m = date.getMinutes(); s = date.getSeconds(); }
      const cx = size / 2;
      const hand = (angle, len, width) => `<line x1="${cx}" y1="${cx}" x2="${cx + Math.sin(angle) * len}" y2="${cx - Math.cos(angle) * len}" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"/>`;
      return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="clock-face">
        <circle cx="${cx}" cy="${cx}" r="${cx - 2}" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/>
        ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${cx + Math.sin(a) * (cx - 9)}" cy="${cx - Math.cos(a) * (cx - 9)}" r="${i % 3 === 0 ? 1.8 : 1}" fill="currentColor" opacity=".45"/>`; }).join('')}
        ${hand(((h + m / 60) / 12) * Math.PI * 2, cx * 0.5, 3)}
        ${hand(((m + s / 60) / 60) * Math.PI * 2, cx * 0.7, 2)}
        ${hand((s / 60) * Math.PI * 2, cx * 0.76, 1)}
        <circle cx="${cx}" cy="${cx}" r="2.2" fill="currentColor"/>
      </svg>`;
    }

    function renderWorld() {
      const now = new Date();
      main.innerHTML = `<div class="clock-world-head"><h2>World Clock</h2><span class="tiny muted">${fmtTime(now, { seconds: true, h24: true })} local</span></div>
        <div class="clock-zones">${zones.map((tz) => {
          const label = ZONES.find(([z]) => z === tz)?.[1] || tz.split('/').pop().replace(/_/g, ' ');
          let timeStr = '';
          let dayDiff = '';
          try {
            timeStr = now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
            const there = new Date(now.toLocaleString('en-US', { timeZone: tz }));
            const here = new Date(now.toLocaleString('en-US'));
            const diff = Math.round((there - here) / 86400000);
            dayDiff = diff > 0 ? 'Tomorrow' : diff < 0 ? 'Yesterday' : 'Today';
          } catch (e) { timeStr = fmtTime(now); }
          const [zoneCity, zoneRegion] = tz.split('/');
          return `<div class="clock-zone" data-tz="${tz}">
            <div class="clock-zone-face">${analog(now, tz)}</div>
            <div class="clock-zone-info"><div class="tiny muted">${dayDiff}, ${escapeHtml(zoneRegion?.replace(/_/g, ' ') || 'UTC')}</div>
              <div class="clock-zone-time">${timeStr}</div><div class="clock-zone-name">${escapeHtml(label)}</div>
              <div class="tiny muted">${zoneCity.replace(/_/g, ' ')}</div></div>
            <button class="icon-btn clock-zone-x" data-rm="${tz}" title="Remove">${glyph('close', 12, 2.4)}</button>
          </div>`;
        }).join('') || '<div class="empty-state">No cities yet</div>'}</div>
        <div class="clock-add-zone"><select data-zone-sel>${ZONES.map(([tz, label]) => `<option value="${tz}">${label} (${tz})</option>`).join('')}</select>
        <button class="btn small" data-add-zone>${glyph('plus', 11, 2.6)} Add City</button></div>`;
      main.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
        zones = zones.filter((z) => z !== b.dataset.rm);
        data.set('worldClocks', zones);
        render();
      }));
      main.querySelector('[data-add-zone]').addEventListener('click', () => {
        const tz = main.querySelector('[data-zone-sel]').value;
        if (!zones.includes(tz)) { zones.push(tz); data.set('worldClocks', zones); render(); }
      });
    }

    function renderAlarms() {
      main.innerHTML = `<div class="clock-world-head"><h2>Alarms</h2><button class="btn small" data-add-alarm>${glyph('plus', 11, 2.6)} Add Alarm</button></div>
        <div class="clock-alarms">${alarms.length ? alarms.map((a) => `<div class="clock-alarm ${a.on ? '' : 'off'}">
          <div class="clock-alarm-time">${a.time}</div>
          <div class="clock-alarm-meta"><b>${escapeHtml(a.label || 'Alarm')}</b><small>${a.days?.length ? a.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : 'Every day'}</small></div>
          <button class="sw-toggle ${a.on ? 'on' : ''}" data-toggle="${a.id}" role="switch" aria-checked="${a.on}"><span></span></button>
          <button class="icon-btn" data-del="${a.id}">${glyph('trash', 14, 1.9)}</button>
        </div>`).join('') : `<div class="empty-state">${glyph('alarm', 40)}<div>No alarms set</div></div>`}</div>`;
      main.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
        const a = alarms.find((x) => x.id === b.dataset.toggle);
        a.on = !a.on;
        data.set('alarms', alarms);
        sound.play('toggle');
        renderAlarms();
      }));
      main.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        alarms = alarms.filter((x) => x.id !== b.dataset.del);
        data.set('alarms', alarms);
        renderAlarms();
      }));
      main.querySelector('[data-add-alarm]').addEventListener('click', async () => {
        const time = await promptModal({ title: 'New Alarm', label: 'Time (24h, e.g. 07:30)', value: '07:30', okLabel: 'Create' });
        if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return;
        alarms.push({ id: uid('a'), time: time.padStart(5, '0'), label: 'Alarm', days: [1, 2, 3, 4, 5], on: true });
        data.set('alarms', alarms);
        renderAlarms();
      });
    }

    function renderStopwatch() {
      main.innerHTML = `<div class="clock-world-head"><h2>Stopwatch</h2></div>
        <div class="sw-display" data-sw>00:00.00</div>
        <div class="hstack" style="justify-content:center;gap:12px;margin:18px 0">
          <button class="btn" data-sw-reset>Reset</button>
          <button class="btn primary" data-sw-toggle style="min-width:96px">${stopwatch.running ? 'Stop' : 'Start'}</button>
          <button class="btn" data-sw-lap ${stopwatch.running ? '' : 'disabled'}>Lap</button>
        </div>
        <div class="sw-laps">${stopwatch.laps.map((l, i) => `<div class="sw-lap"><span>Lap ${i + 1}</span><span class="mono">${l}</span></div>`).join('')}</div>`;
      main.querySelector('[data-sw-toggle]').addEventListener('click', () => {
        if (stopwatch.running) {
          stopwatch.elapsed += Date.now() - stopwatch.start;
          stopwatch.running = false;
        } else {
          stopwatch.start = Date.now();
          stopwatch.running = true;
        }
        renderStopwatch();
      });
      main.querySelector('[data-sw-reset]').addEventListener('click', () => {
        stopwatch = { running: false, start: 0, elapsed: 0, laps: [] };
        renderStopwatch();
      });
      main.querySelector('[data-sw-lap]')?.addEventListener('click', () => {
        const ms = stopwatch.elapsed + (stopwatch.running ? Date.now() - stopwatch.start : 0);
        stopwatch.laps.unshift(fmtSW(ms));
        renderStopwatch();
      });
    }

    function fmtSW(ms) {
      const total = Math.floor(ms / 10);
      const cs = total % 100;
      const s = Math.floor(total / 100) % 60;
      const m = Math.floor(total / 6000);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }

    function renderTimers() {
      main.innerHTML = `<div class="clock-world-head"><h2>Timers</h2></div>
        <div class="clock-timer-form">
          <label>Hours <input type="number" min="0" max="23" value="0" data-th></label>
          <label>Minutes <input type="number" min="0" max="59" value="5" data-tm></label>
          <label>Seconds <input type="number" min="0" max="59" value="0" data-ts></label>
          <button class="btn primary" data-start-timer>Start</button>
        </div>
        <div class="clock-timer-presets">${[1, 3, 5, 10, 15, 25].map((m) => `<button class="cc-chip" data-preset="${m}">${m} min</button>`).join('')}</div>
        <div class="clock-timers">${timers.map((t) => `<div class="clock-timer ${t.done ? 'done' : ''}">
          <div class="clock-timer-time mono">${t.done ? 'Done' : fmtTimeLeft(t.remaining)}</div>
          <div class="clock-timer-meta"><b>${escapeHtml(t.label)}</b><small>${t.done ? 'Completed' : 'Running'}</small></div>
          <button class="icon-btn" data-cancel-timer="${t.id}">${glyph('close', 13, 2.2)}</button>
        </div>`).join('') || '<div class="empty-state">No timers running</div>'}</div>`;
      const start = (mins, secs) => {
        const total = Math.max(1, mins * 60 + secs);
        timers.push({ id: uid('t'), label: `${Math.round(total / 60) || 1} min timer`, remaining: total, done: false });
        renderTimers();
      };
      main.querySelector('[data-start-timer]').addEventListener('click', () => {
        const h = Number(main.querySelector('[data-th]').value || 0);
        const m = Number(main.querySelector('[data-tm]').value || 0);
        const s = Number(main.querySelector('[data-ts]').value || 0);
        start(h * 60 + m, s);
      });
      main.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => start(Number(b.dataset.preset), 0)));
      main.querySelectorAll('[data-cancel-timer]').forEach((b) => b.addEventListener('click', () => {
        timers = timers.filter((t) => t.id !== b.dataset.cancelTimer);
        renderTimers();
      }));
    }

    const fmtTimeLeft = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    function render() {
      root.querySelectorAll('.clock-nav').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      if (tab === 'world') renderWorld();
      if (tab === 'alarms') renderAlarms();
      if (tab === 'stopwatch') renderStopwatch();
      if (tab === 'timers') renderTimers();
      win.setTitle(`Clock — ${tab[0].toUpperCase() + tab.slice(1)}`);
      toolbar.innerHTML = `<span class="fn-toolbar-title">${fmtTime(new Date(), { seconds: true })}</span><span class="spacer"></span><span class="tiny muted no-drag">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>`;
    }

    win._tab = (t) => { tab = t; render(); };

    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));

    // ticking
    clockInterval = setInterval(() => {
      if (!root.isConnected) return;
      if (tab === 'world') renderWorld();
      if (tab === 'stopwatch') {
        const el = main.querySelector('[data-sw]');
        if (el) el.textContent = fmtSW(stopwatch.elapsed + (stopwatch.running ? Date.now() - stopwatch.start : 0));
      }
      // timers
      if (timers.some((t) => !t.done)) {
        timers.forEach((t) => {
          if (t.done) return;
          t.remaining -= 1;
          if (t.remaining <= 0) {
            t.done = true;
            sound.play('success');
            notify.post({ title: 'Timer finished', body: t.label + ' reached zero.', icon: 'timer', colors: ['#3a3f4b', '#0f1319'], app: 'Clock', appId: 'clock' });
          }
        });
        if (tab === 'timers') renderTimers();
      }
      // alarms
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      alarms.forEach((a) => {
        if (!a.on || a.lastFired === hhmm) return;
        if (a.time === hhmm && (a.days?.length ? a.days.includes(now.getDay()) : true)) {
          a.lastFired = hhmm;
          sound.play('chime');
          notify.post({ title: 'Alarm', body: a.label || 'Wake up!', icon: 'alarm', colors: ['#3a3f4b', '#0f1319'], app: 'Clock', appId: 'clock' });
        }
      });
    }, 1000);

    win.onClose(() => clearInterval(clockInterval));
    render();
  },
};
