/* CanopyOS — Calendar */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { monthGrid, monthName, fmtShortDate, escapeHtml, uid, sameDay, daysUntil } from '../core/util.js';
import { notify } from '../core/notify.js';
import { confirmModal } from '../ui/modal.js';

const CALENDARS = [
  { name: 'Work', color: '#0a84ff' },
  { name: 'Personal', color: '#34c759' },
  { name: 'Birthdays', color: '#ff9f0a' },
];

export default {
  id: 'calendar',
  name: 'Calendar',
  icon: 'calendar',
  colors: ['#ff6b6b', '#ffffff'],
  iconOpts: { strokeWidth: 1.9 },
  width: 900, height: 580,
  keywords: ['events', 'schedule', 'dates', 'month'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Event', shortcut: '⌘N', action: () => win?._newEvent() },
      { label: 'Go to Today', shortcut: '⌘T', action: () => win?._today() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'View', items: [
      { label: 'Month', checked: true, action: () => {} },
      { label: 'Hide Calendars', action: () => win?._toggleSidebar() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let cursor = new Date();
    cursor.setDate(1);
    let selected = new Date();
    let events = data.get('events', []);
    let hidden = new Set();
    let editor = null; // { id?, date }
    let showSidebar = true;

    root.innerHTML = `<div class="cal">
      <aside class="cal-side">
        <div class="cal-side-head"><div class="cal-month-name" data-mname></div><div class="tiny muted" data-my></div></div>
        <div class="cal-mini" data-mini></div>
        <div class="cal-cals" data-cals></div>
        <div class="cal-upcoming" data-upcoming></div>
      </aside>
      <section class="cal-main">
        <div class="cal-main-head">
          <div class="cal-title" data-title></div>
          <span class="spacer"></span>
          <div class="hstack" style="gap:2px">
            <button class="icon-btn" data-nav="-1" title="Previous month">${glyph('chevronLeft', 15, 2)}</button>
            <button class="btn small" data-today>Today</button>
            <button class="icon-btn" data-nav="1" title="Next month">${glyph('chevronRight', 15, 2)}</button>
          </div>
        </div>
        <div class="cal-weekdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid" data-grid></div>
      </section>
      <aside class="cal-daypanel" data-daypanel></aside>
    </div>`;

    const mini = root.querySelector('[data-mini]');
    const grid = root.querySelector('[data-grid]');
    const dayPanel = root.querySelector('[data-daypanel]');
    const titleEl = root.querySelector('[data-title]');
    const mnameEl = root.querySelector('[data-mname]');
    const myEl = root.querySelector('[data-my]');
    const calsEl = root.querySelector('[data-cals]');
    const upcomingEl = root.querySelector('[data-upcoming]');

    const eventsFor = (d) => events.filter((e) => {
      const ed = new Date(e.date + 'T00:00:00');
      return sameDay(ed, d) && !hidden.has(e.calendar);
    }).sort((a, b) => a.start.localeCompare(b.start));

    function miniCal() {
      const now = new Date();
      const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
      mini.innerHTML = `<div class="cal-mini-head">${monthName(cursor.getMonth()).slice(0, 3)} ${cursor.getFullYear()}</div>
        <div class="cal-mini-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="cm-h">${d}</span>`).join('')}
        ${cells.map((c) => `<span class="cm-d ${c.dim ? 'dim' : ''} ${sameDay(c.date, new Date()) ? 'today' : ''} ${sameDay(c.date, selected) ? 'sel' : ''}" data-date="${c.date.toISOString()}">${c.day}</span>`).join('')}</div>`;
      mini.querySelectorAll('[data-date]').forEach((el) => el.addEventListener('click', () => {
        selected = new Date(el.dataset.date);
        render();
      }));
    }

    function renderCals() {
      calsEl.innerHTML = `<div class="cal-cals-title">My Calendars</div>` + CALENDARS.map((c) => `
        <label class="cal-cal"><input type="checkbox" ${hidden.has(c.name) ? '' : 'checked'} data-cal="${c.name}"><i style="background:${c.color}"></i>${c.name}</label>`).join('');
      calsEl.querySelectorAll('[data-cal]').forEach((cb) => cb.addEventListener('change', () => {
        if (cb.checked) hidden.delete(cb.dataset.cal); else hidden.add(cb.dataset.cal);
        render();
      }));
    }

    function renderUpcoming() {
      const up = events
        .map((e) => ({ ...e, days: daysUntil(new Date(e.date + 'T00:00:00')) }))
        .filter((e) => e.days >= 0 && !hidden.has(e.calendar))
        .sort((a, b) => a.days - b.days || a.start.localeCompare(b.start))
        .slice(0, 4);
      upcomingEl.innerHTML = `<div class="cal-cals-title">Upcoming</div>` + (up.length ? up.map((e) => `
        <div class="cal-up-item"><i style="background:${e.color || '#0a84ff'}"></i>
          <div><b>${escapeHtml(e.title)}</b><small>${e.days === 0 ? 'Today' : e.days === 1 ? 'Tomorrow' : `In ${e.days} days`} · ${e.start}</small></div>
        </div>`).join('') : '<div class="tiny muted" style="padding:6px 2px">No upcoming events</div>');
    }

    function renderGrid() {
      const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
      grid.innerHTML = cells.map((c) => {
        const list = eventsFor(c.date);
        const isToday = sameDay(c.date, new Date());
        return `<div class="cal-cell ${c.dim ? 'dim' : ''} ${isToday ? 'today' : ''} ${sameDay(c.date, selected) ? 'sel' : ''}" data-day="${c.date.toISOString()}">
          <div class="cal-cell-num">${c.day}</div>
          ${list.slice(0, 3).map((e) => `<button class="cal-event" data-event="${e.id}" style="--ev:${e.color || '#0a84ff'}"><b>${e.start}</b> ${escapeHtml(e.title)}</button>`).join('')}
          ${list.length > 3 ? `<div class="cal-more">+${list.length - 3} more</div>` : ''}
        </div>`;
      }).join('');
      grid.querySelectorAll('[data-day]').forEach((el) => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.cal-event')) return;
          selected = new Date(el.dataset.day);
          render();
        });
        el.addEventListener('dblclick', (e) => {
          if (e.target.closest('.cal-event')) return;
          openEditor({ date: el.dataset.day.slice(0, 10) });
        });
      });
      grid.querySelectorAll('[data-event]').forEach((el) => el.addEventListener('click', (e) => {
        e.stopPropagation();
        const ev = events.find((x) => x.id === el.dataset.event);
        if (ev) openEditor(ev);
      }));
    }

    function renderDayPanel() {
      const list = eventsFor(selected);
      if (editor) return renderEditor();
      dayPanel.innerHTML = `<div class="cal-dp-head"><div><div class="cal-dp-day">${selected.getDate()}</div><div class="tiny muted">${selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long' })}</div></div>
        <button class="btn small" data-addevent>${glyph('plus', 11, 2.6)} Event</button></div>
        <div class="cal-dp-list">${list.length ? list.map((e) => `<div class="cal-dp-item" data-ev="${e.id}" style="--ev:${e.color || '#0a84ff'}">
          <div class="cal-dp-time">${e.start}<br><span class="tiny muted">${e.end}</span></div>
          <div><b>${escapeHtml(e.title)}</b>${e.location ? `<small>${glyph('pin', 10, 2)} ${escapeHtml(e.location)}</small>` : ''}<small>${escapeHtml(e.calendar)}</small></div>
        </div>`).join('') : `<div class="tiny muted" style="padding:14px 0">No events</div>`}</div>
        ${list.length ? `<button class="btn small ghost" data-delete-first style="color:#ff453a;margin-top:8px">Delete event</button>` : ''}`;
      dayPanel.querySelector('[data-addevent]')?.addEventListener('click', () => openEditor({ date: selected.toISOString().slice(0, 10) }));
      dayPanel.querySelectorAll('[data-ev]').forEach((el) => el.addEventListener('click', () => {
        const ev = events.find((x) => x.id === el.dataset.ev);
        if (ev) openEditor(ev);
      }));
      const del = dayPanel.querySelector('[data-delete-first]');
      if (del) del.addEventListener('click', async () => {
        const ev = list[0];
        const ok = await confirmModal({ title: `Delete “${ev.title}”?`, body: 'This event will be removed from your calendar.', okLabel: 'Delete' });
        if (ok) { events = events.filter((x) => x.id !== ev.id); data.set('events', events); render(); }
      });
    }

    function openEditor(opts = {}) {
      editor = { id: opts.id, date: opts.date || selected.toISOString().slice(0, 10), title: opts.title || '', start: opts.start || '10:00', end: opts.end || '11:00', location: opts.location || '', calendar: opts.calendar || 'Work', notes: opts.notes || '', color: opts.color || CALENDARS.find((c) => c.name === (opts.calendar || 'Work'))?.color || '#0a84ff', isNew: !opts.id };
      renderDayPanel();
    }
    win._newEvent = () => openEditor({ date: new Date().toISOString().slice(0, 10) });
    win._today = () => { cursor = new Date(); cursor.setDate(1); selected = new Date(); render(); };
    win._toggleSidebar = () => { showSidebar = !showSidebar; root.querySelector('.cal-side').style.display = showSidebar ? '' : 'none'; };

    function renderEditor() {
      const e = editor;
      dayPanel.innerHTML = `<div class="cal-dp-head"><b>${e.isNew ? 'New Event' : 'Edit Event'}</b><button class="icon-btn" data-close>${glyph('close', 12, 2.4)}</button></div>
        <div class="cal-form">
          <input class="cal-form-title" placeholder="Add title" value="${escapeHtml(e.title)}" data-f="title" />
          <label class="cal-form-row">${glyph('calendar', 13, 1.9)}<input type="date" value="${e.date}" data-f="date"></label>
          <label class="cal-form-row">${glyph('clock', 13, 1.9)}<input type="time" value="${e.start}" data-f="start"> – <input type="time" value="${e.end}" data-f="end"></label>
          <label class="cal-form-row">${glyph('pin', 13, 1.9)}<input type="text" placeholder="Location" value="${escapeHtml(e.location)}" data-f="location"></label>
          <label class="cal-form-row">${glyph('layers', 13, 1.9)}<select data-f="calendar">${CALENDARS.map((c) => `<option ${c.name === e.calendar ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
          <textarea placeholder="Notes" data-f="notes">${escapeHtml(e.notes)}</textarea>
          <div class="hstack" style="margin-top:8px"><span class="spacer"></span>
            ${e.isNew ? '' : '<button class="btn small danger" data-del>Delete</button>'}
            <button class="btn small primary" data-save>Save</button></div>
        </div>`;
      dayPanel.querySelector('[data-close]').addEventListener('click', () => { editor = null; renderDayPanel(); });
      dayPanel.querySelectorAll('[data-f]').forEach((input) => input.addEventListener('input', () => { editor[input.dataset.f] = input.value; }));
      dayPanel.querySelector('[data-save]')?.addEventListener('click', () => {
        if (!editor.title.trim()) { dayPanel.querySelector('[data-f="title"]').focus(); return; }
        const cal = CALENDARS.find((c) => c.name === editor.calendar) || CALENDARS[0];
        const payload = {
          id: editor.id || uid('ev'), title: editor.title.trim(), date: editor.date, start: editor.start,
          end: editor.end, location: editor.location, calendar: cal.name, color: cal.color, notes: editor.notes,
        };
        if (editor.id) events = events.map((x) => (x.id === editor.id ? payload : x));
        else events.push(payload);
        data.set('events', events);
        editor = null;
        selected = new Date(payload.date + 'T00:00:00');
        cursor = new Date(selected.getFullYear(), selected.getMonth(), 1);
        sound.play('success');
        notify.post({ title: 'Event saved', body: `${payload.title} · ${fmtShortDate(selected)} at ${payload.start}`, app: 'Calendar', appId: 'calendar', icon: 'calendar', colors: ['#ff6b6b', '#d43f4f'] });
        render();
      });
      dayPanel.querySelector('[data-del]')?.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete event?', body: 'This event will be removed.', okLabel: 'Delete' });
        if (ok) { events = events.filter((x) => x.id !== editor.id); data.set('events', events); editor = null; render(); }
      });
    }

    function render() {
      titleEl.textContent = `${monthName(cursor.getMonth())} ${cursor.getFullYear()}`;
      mnameEl.textContent = monthName(new Date().getMonth());
      myEl.textContent = new Date().getFullYear();
      toolbar.innerHTML = `<span class="fn-toolbar-title">${monthName(cursor.getMonth())} ${cursor.getFullYear()}</span><span class="spacer"></span>
        <button class="icon-btn no-drag" data-tb-prev title="Previous">${glyph('chevronLeft', 15, 2)}</button>
        <button class="btn small no-drag" data-tb-today>Today</button>
        <button class="icon-btn no-drag" data-tb-next title="Next">${glyph('chevronRight', 15, 2)}</button>
        <button class="btn small no-drag" data-tb-new>${glyph('plus', 11, 2.6)} Event</button>`;
      toolbar.querySelector('[data-tb-prev]').addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); render(); });
      toolbar.querySelector('[data-tb-next]').addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); render(); });
      toolbar.querySelector('[data-tb-today]').addEventListener('click', () => win._today());
      toolbar.querySelector('[data-tb-new]').addEventListener('click', () => win._newEvent());
      miniCal();
      renderCals();
      renderUpcoming();
      renderGrid();
      renderDayPanel();
    }

    root.querySelector('[data-today]').addEventListener('click', () => win._today());
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      cursor.setMonth(cursor.getMonth() + Number(b.dataset.nav));
      render();
    }));

    win.setTitle('Calendar');
    render();
    const sub = data.subscribe('events', (list) => { events = list; render(); });
    win.onClose(() => sub());
  },
};
