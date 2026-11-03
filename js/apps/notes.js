/* CanopyOS — Notes */
import { data } from '../core/data.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, relTime, uid, debounce } from '../core/util.js';
import { promptModal, confirmModal } from '../ui/modal.js';

function mdToHtml(text) {
  let html = escapeHtml(text);
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>').replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- \[x\] (.+)$/gim, '<div class="md-check done">☑ $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gim, '<div class="md-check">☐ $1</div>');
  html = html.replace(/^- (.+)$/gm, '<div class="md-li">• $1</div>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export default {
  id: 'notes',
  name: 'Notes',
  icon: 'notes',
  colors: ['#ffd45e', '#e0a300'],
  width: 900, height: 580,
  keywords: ['notes', 'write', 'journal', 'memo'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Note', shortcut: '⌘N', action: () => win?._newNote() },
      { label: 'New Folder', action: () => win?._newFolder() },
      { sep: true },
      { label: 'Delete Note', action: () => win?._deleteNote() },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: '⌘Z', action: () => document.execCommand('undo') },
      { label: 'Redo', shortcut: '⇧⌘Z', action: () => document.execCommand('redo') },
      { sep: true },
      { label: 'Pin Note', action: () => win?._togglePin() },
    ] },
    { label: 'View', items: [
      { label: 'Preview Markdown', shortcut: '⌘↩', action: () => win?._togglePreview() },
      { label: 'Sort By Date', action: () => win?._sort('date') },
      { label: 'Sort By Title', action: () => win?._sort('title') },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let notes = data.get('notes', []);
    let folders = data.get('notesFolders', ['Work', 'Personal']);
    let activeFolder = 'All';
    let activeId = args?.id || (args?.new ? null : notes[0]?.id);
    let query = '';
    let preview = false;
    let sortMode = 'date';

    if (args?.new) activeId = null;

    root.innerHTML = `<div class="notes">
      <aside class="notes-side">
        <div class="notes-side-head">
          <div class="tiny muted" style="font-weight:700;letter-spacing:.06em">FOLDERS</div>
          <button class="icon-btn" data-newfolder title="New folder">${glyph('plus', 13, 2)}</button>
        </div>
        <div class="notes-folders"></div>
      </aside>
      <section class="notes-list">
        <div class="notes-list-head"><input type="search" placeholder="Search notes" data-search aria-label="Search notes" /></div>
        <div class="notes-items scroll-thin"></div>
      </section>
      <section class="notes-editor">
        <div class="notes-editor-head">
          <input class="notes-title" placeholder="New Note" aria-label="Note title" data-title />
          <button class="icon-btn" data-pin title="Pin note">${glyph('star', 15, 1.8)}</button>
          <button class="icon-btn" data-prev title="Preview">${glyph('eye', 15, 1.8)}</button>
          <button class="icon-btn" data-del title="Delete note">${glyph('trash', 15, 1.8)}</button>
        </div>
        <div class="notes-meta" data-meta></div>
        <textarea class="notes-body scroll-thin" data-body placeholder="Start writing…" spellcheck="true"></textarea>
        <div class="notes-preview scroll-thin" data-preview hidden></div>
        <div class="notes-foot"><span data-count></span><span class="spacer"></span><span data-tags></span></div>
      </section>
    </div>`;

    const foldersEl = root.querySelector('.notes-folders');
    const itemsEl = root.querySelector('.notes-items');
    const titleInput = root.querySelector('[data-title]');
    const bodyEl = root.querySelector('[data-body]');
    const previewEl = root.querySelector('[data-preview]');
    const metaEl = root.querySelector('[data-meta]');
    const countEl = root.querySelector('[data-count]');
    const tagsEl = root.querySelector('[data-tags]');
    const searchEl = root.querySelector('[data-search]');

    const current = () => notes.find((n) => n.id === activeId);

    const save = debounce(() => {
      const n = current();
      if (!n) return;
      n.updated = Date.now();
      data.set('notes', notes);
    }, 400);

    function newNote() {
      const note = {
        id: uid('note'), title: 'New Note', folder: activeFolder === 'All' ? 'Personal' : activeFolder,
        tags: [], updated: Date.now(), pinned: false, body: '',
      };
      notes.unshift(note);
      data.set('notes', notes);
      activeId = note.id;
      renderAll();
      setTimeout(() => titleInput.select(), 50);
    }
    win._newNote = newNote;
    win._deleteNote = async () => {
      const n = current();
      if (!n) return;
      const ok = await confirmModal({ title: `Delete “${n.title}”?`, body: 'This note will be removed permanently.', okLabel: 'Delete' });
      if (!ok) return;
      notes = notes.filter((x) => x.id !== n.id);
      data.set('notes', notes);
      activeId = notes[0]?.id || null;
      sound.play('trash');
      renderAll();
    };
    win._togglePin = () => {
      const n = current();
      if (!n) return;
      n.pinned = !n.pinned;
      data.set('notes', notes);
      renderAll();
    };
    win._togglePreview = () => { preview = !preview; renderEditor(); };
    win._sort = (mode) => { sortMode = mode; renderList(); };
    win._newFolder = async () => {
      const name = await promptModal({ title: 'New Folder', value: 'Ideas', okLabel: 'Create' });
      if (!name) return;
      folders = [...new Set([...folders, name])];
      data.set('notesFolders', folders);
      renderFolders();
    };

    function renderFolders() {
      const counts = { All: notes.length };
      folders.forEach((f) => { counts[f] = notes.filter((n) => n.folder === f).length; });
      foldersEl.innerHTML = ['All', ...folders].map((f) => `<button class="notes-folder ${activeFolder === f ? 'active' : ''}" data-folder="${escapeHtml(f)}">
        <span class="fn-side-ico">${glyph(f === 'All' ? 'notes' : 'folder', 14, 1.8)}</span><span>${escapeHtml(f)}</span><span class="fn-side-count">${counts[f] || 0}</span>
      </button>`).join('');
      foldersEl.querySelectorAll('[data-folder]').forEach((b) => b.addEventListener('click', () => {
        activeFolder = b.dataset.folder;
        const first = visible()[0];
        if (first) activeId = first.id;
        renderAll();
      }));
    }

    function visible() {
      let list = notes.filter((n) => activeFolder === 'All' || n.folder === activeFolder);
      if (query) {
        const q = query.toLowerCase();
        list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
      }
      return list.sort((a, b) => {
        if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
        if (sortMode === 'title') return a.title.localeCompare(b.title);
        return b.updated - a.updated;
      });
    }

    function renderList() {
      const list = visible();
      itemsEl.innerHTML = list.length ? list.map((n) => `<button class="notes-item ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
        <div class="notes-item-top"><b>${escapeHtml(n.title || 'Untitled')}</b><span class="tiny muted">${relTime(n.updated)}</span></div>
        <div class="notes-item-sub">${escapeHtml((n.body || 'No additional text').replace(/\n/g, ' ').slice(0, 90))}</div>
        <div class="notes-item-tags">${n.pinned ? `<span class="note-pin">${glyph('star', 10, 2)}</span>` : ''}${(n.tags || []).map((t) => `<span class="note-tag">${escapeHtml(t)}</span>`).join('')}<span class="note-tag">${escapeHtml(n.folder)}</span></div>
      </button>`).join('') : `<div class="empty-state" style="padding:30px 10px">${glyph('notes', 32)}<div>No notes</div></div>`;
      itemsEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
        activeId = b.dataset.id;
        renderList();
        renderEditor();
      }));
    }

    function renderEditor() {
      const n = current();
      const disabled = !n;
      titleInput.disabled = disabled;
      bodyEl.disabled = disabled;
      if (!n) {
        titleInput.value = '';
        bodyEl.value = '';
        metaEl.textContent = 'Select a note or create one with ⌘N';
        countEl.textContent = '';
        tagsEl.innerHTML = '';
        previewEl.hidden = true;
        bodyEl.hidden = false;
        return;
      }
      titleInput.value = n.title;
      bodyEl.value = n.body;
      metaEl.innerHTML = `<span>${escapeHtml(n.folder)}</span><span>·</span><span>Edited ${relTime(n.updated)}</span>${n.pinned ? `<span>·</span><span>Pinned</span>` : ''}`;
      countEl.textContent = `${n.body.trim().split(/\s+/).filter(Boolean).length} words`;
      tagsEl.innerHTML = (n.tags || []).map((t) => `<span class="note-tag">${escapeHtml(t)}</span>`).join('') + `<button class="note-add-tag" data-addtag>+ tag</button>`;
      tagsEl.querySelector('[data-addtag]')?.addEventListener('click', async () => {
        const tag = await promptModal({ title: 'Add Tag', value: 'idea' });
        if (tag) { n.tags = [...new Set([...(n.tags || []), tag])]; data.set('notes', notes); renderEditor(); renderList(); }
      });
      previewEl.innerHTML = `<div class="md">${mdToHtml(n.body)}</div>`;
      bodyEl.hidden = preview;
      previewEl.hidden = !preview;
      root.querySelector('[data-prev]').classList.toggle('on', preview);
      root.querySelector('[data-pin]').style.color = n.pinned ? 'var(--accent)' : '';
    }

    function renderAll() {
      renderFolders();
      renderList();
      renderEditor();
    }

    titleInput.addEventListener('input', () => {
      const n = current();
      if (!n) return;
      n.title = titleInput.value;
      save();
      renderList();
    });
    bodyEl.addEventListener('input', () => {
      const n = current();
      if (!n) return;
      n.body = bodyEl.value;
      countEl.textContent = `${bodyEl.value.trim().split(/\s+/).filter(Boolean).length} words`;
      previewEl.innerHTML = `<div class="md">${mdToHtml(n.body)}</div>`;
      save();
    });
    searchEl.addEventListener('input', () => { query = searchEl.value; renderList(); });
    root.querySelector('[data-del]').addEventListener('click', () => win._deleteNote());
    root.querySelector('[data-pin]').addEventListener('click', () => win._togglePin());
    root.querySelector('[data-prev]').addEventListener('click', () => win._togglePreview());
    root.querySelector('[data-newfolder]').addEventListener('click', () => win._newFolder());

    toolbar.innerHTML = `<button class="btn small no-drag" data-new>${glyph('plus', 12, 2.4)} New Note</button>
      <button class="btn small no-drag" data-tagfilter>${glyph('tag', 12, 1.9)} Tags</button>
      <span class="spacer"></span><span class="tiny muted no-drag" data-total></span>`;
    toolbar.querySelector('[data-new]').addEventListener('click', () => newNote());
    toolbar.querySelector('[data-tagfilter]').addEventListener('click', () => {
      query = '';
      searchEl.value = '';
      activeFolder = 'All';
      renderAll();
    });

    if (!activeId && notes.length) activeId = notes[0].id;
    if (!activeId) newNote();
    else renderAll();
    toolbar.querySelector('[data-total]').textContent = `${notes.length} notes`;

    const sub = data.subscribe('notes', (list) => { notes = list; renderList(); });
    win.onClose(() => sub());
  },
};
