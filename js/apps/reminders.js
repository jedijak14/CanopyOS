/* CanopyOS — Reminders */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, uid, daysUntil, fmtShortDate } from '../core/util.js';
import { notify } from '../core/notify.js';
import { promptModal } from '../ui/modal.js';

const PRIORITY = { high: '#ff453a', normal: '#ff9f0a', low: '#8e8e93' };
const SMART = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'upcoming', label: 'Scheduled', icon: 'calendar' },
  { id: 'all', label: 'All', icon: 'list' },
  { id: 'completed', label: 'Completed', icon: 'checkCircle' },
];

export default {
  id: 'reminders',
  name: 'Reminders',
  icon: 'reminders',
  colors: ['#f6f7f9', '#c9d0d9'],
  iconOpts: { strokeWidth: 1.9 },
  width: 780, height: 560,
  keywords: ['todo', 'tasks', 'checklist', 'grocery'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Reminder', shortcut: '⌘N', action: () => win?._new() },
      { label: 'New List', action: () => win?._newList() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'View', items: [
      { label: 'Show Completed', action: () => win?._goto('completed') },
      { label: 'Today', action: () => win?._goto('today') },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let items = data.get('reminders', []);
    let lists = data.get('remindersLists', ['Personal', 'Work', 'Errands']);
    let view = 'today';
    let adding = false;

    root.innerHTML = `<div class="rem">
      <aside class="rem-side">
        <div class="rem-smart" data-smart></div>
        <div class="rem-lists-title">My Lists</div>
        <div class="rem-lists" data-lists></div>
        <button class="rem-addlist" data-addlist>${glyph('plusCircle', 13, 1.8)} Add List</button>
      </aside>
      <section class="rem-main">
        <div class="rem-head"><h2 data-title></h2><span class="spacer"></span><button class="icon-btn" data-new title="New reminder">${glyph('plusCircle', 18, 1.6)}</button></div>
        <div class="rem-progress"><div class="rem-progress-bar"><span data-progress></span></div><span class="tiny muted" data-progress-text></span></div>
        <div class="rem-list scroll-thin" data-items></div>
        <div class="rem-addrow" data-addrow hidden><input type="text" placeholder="New reminder" data-newinput /><button class="btn small primary" data-addsave>Add</button></div>
      </section>
    </div>`;

    const smartEl = root.querySelector('[data-smart]');
    const listsEl = root.querySelector('[data-lists]');
    const itemsEl = root.querySelector('[data-items]');
    const titleEl = root.querySelector('[data-title]');
    const addRow = root.querySelector('[data-addrow]');
    const newInput = root.querySelector('[data-newinput]');

    const persist = () => data.set('reminders', items);

    function filtered() {
      const today = new Date().toISOString().slice(0, 10);
      if (view === 'today') return items.filter((r) => !r.done && r.due && r.due <= today);
      if (view === 'upcoming') return items.filter((r) => !r.done && r.due && r.due > today).sort((a, b) => a.due.localeCompare(b.due));
      if (view === 'completed') return items.filter((r) => r.done);
      if (view === 'all') return items;
      return items.filter((r) => r.list === view);
    }

    function renderSide() {
      const today = new Date().toISOString().slice(0, 10);
      smartEl.innerHTML = SMART.map((s) => {
        const count = s.id === 'today' ? items.filter((r) => !r.done && r.due <= today).length
          : s.id === 'all' ? items.filter((r) => !r.done).length : '';
        return `<button class="rem-smart-item ${view === s.id ? 'active' : ''}" data-view="${s.id}">
          <span class="rem-smart-ico" style="background:${s.id === 'today' ? '#0a84ff' : s.id === 'upcoming' ? '#ff453a' : '#8e8e93'}">${glyph(s.icon, 13, 2)}</span>
          <span>${s.label}</span><span class="spacer"></span>${count ? `<span class="rem-count">${count}</span>` : ''}
        </button>`;
      }).join('');
      smartEl.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
      listsEl.innerHTML = lists.map((l) => {
        const count = items.filter((r) => r.list === l && !r.done).length;
        return `<button class="rem-list-item ${view === l ? 'active' : ''}" data-list="${escapeHtml(l)}">
          <span class="rem-dot" style="background:${listColor(l)}"></span><span>${escapeHtml(l)}</span><span class="spacer"></span>${count ? `<span class="rem-count">${count}</span>` : ''}
        </button>`;
      }).join('');
      listsEl.querySelectorAll('[data-list]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.list; render(); }));
    }

    function renderItems() {
      const list = filtered();
      const label = SMART.find((s) => s.id === view)?.label || view;
      titleEl.textContent = label;
      const total = list.length;
      const done = list.filter((r) => r.done).length;
      root.querySelector('[data-progress]').style.width = `${total ? (done / total) * 100 : 0}%`;
      root.querySelector('[data-progress-text]').textContent = total ? `${done} of ${total} complete` : 'Nothing here';
      itemsEl.innerHTML = list.length ? list.map((r) => {
        const due = r.due ? daysUntil(new Date(r.due + 'T00:00:00')) : null;
        const dueLabel = due === null ? '' : due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Today' : due === 1 ? 'Tomorrow' : fmtShortDate(new Date(r.due + 'T00:00:00'));
        return `<div class="rem-item ${r.done ? 'done' : ''}" data-id="${r.id}">
          <button class="rem-check ${r.done ? 'on' : ''}" data-check="${r.id}" aria-label="Toggle complete">${r.done ? glyph('check', 11, 3) : ''}</button>
          <div class="rem-item-main">
            <div class="rem-item-title">${escapeHtml(r.title)}</div>
            <div class="rem-item-meta">
              ${dueLabel ? `<span class="${due < 0 ? 'overdue' : ''}">${glyph('calendar', 10, 2)} ${dueLabel}</span>` : ''}
              <span>${escapeHtml(r.list)}</span>
              ${r.notes ? `<span>${glyph('doc', 10, 2)} ${escapeHtml(r.notes.slice(0, 40))}</span>` : ''}
            </div>
          </div>
          <span class="rem-pri" style="background:${PRIORITY[r.priority] || PRIORITY.normal}" title="${r.priority} priority"></span>
          <button class="icon-btn rem-del" data-del="${r.id}" title="Delete">${glyph('trash', 13, 1.9)}</button>
        </div>`;
      }).join('') : `<div class="empty-state">${glyph('checkCircle', 40)}<div>No reminders</div><button class="btn small" data-empty-add>Add one</button></div>`;

      itemsEl.querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', () => {
        const r = items.find((x) => x.id === b.dataset.check);
        if (!r) return;
        r.done = !r.done;
        persist();
        if (r.done) sound.play('success'); else sound.play('pop');
        render();
        if (r.done) notify.post({ title: 'Reminder completed', body: r.title, icon: 'checkCircle', colors: ['#30d158', '#0f7a34'], app: 'Reminders', appId: 'reminders', silent: true });
      }));
      itemsEl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        items = items.filter((x) => x.id !== b.dataset.del);
        persist(); render(); sound.play('trash');
      }));
      itemsEl.querySelector('[data-empty-add]')?.addEventListener('click', () => win._new());
      itemsEl.querySelectorAll('.rem-item').forEach((el) => el.addEventListener('dblclick', () => {
        const r = items.find((x) => x.id === el.dataset.id);
        if (!r) return;
        const input = document.createElement('input');
        input.value = r.title;
        input.className = 'rem-inline-edit';
        el.querySelector('.rem-item-title').replaceWith(input);
        input.focus();
        const commit = () => { r.title = input.value.trim() || r.title; persist(); render(); };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
      }));
    }

    win._new = () => {
      adding = true;
      addRow.hidden = false;
      newInput.value = '';
      newInput.focus();
    };
    win._newList = async () => {
      const name = await promptModal({ title: 'New List', value: 'Ideas', okLabel: 'Create' });
      if (!name) return;
      lists = [...new Set([...lists, name])];
      data.set('remindersLists', lists);
      view = name;
      render();
    };
    win._goto = (v) => { view = v; render(); };

    root.querySelector('[data-new]').addEventListener('click', () => win._new());
    root.querySelector('[data-addlist]').addEventListener('click', () => win._newList());
    const addSave = () => {
      const title = newInput.value.trim();
      if (!title) { adding = false; addRow.hidden = true; return; }
      const list = SMART.some((s) => s.id === view) ? lists[0] : view;
      items.unshift({ id: uid('r'), title, list, done: false, due: new Date().toISOString().slice(0, 10), priority: 'normal', notes: '' });
      persist();
      newInput.value = '';
      render();
      newInput.focus();
      sound.play('pop');
    };
    root.querySelector('[data-addsave]').addEventListener('click', addSave);
    newInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addSave();
      if (e.key === 'Escape') { addRow.hidden = true; adding = false; }
    });

    function render() {
      renderSide();
      renderItems();
      toolbar.innerHTML = `<span class="fn-toolbar-title">Reminders</span><span class="spacer"></span>
        <button class="btn small no-drag" data-tb-new>${glyph('plus', 11, 2.6)} New Reminder</button>`;
      toolbar.querySelector('[data-tb-new]').addEventListener('click', () => win._new());
    }

    render();
    const sub = data.subscribe('reminders', (list) => { items = list; render(); });
    win.onClose(() => sub());
  },
};

function listColor(name) {
  const colors = ['#0a84ff', '#ff9f0a', '#34c759', '#ff375f', '#8e5cf7', '#5ac8fa'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}
