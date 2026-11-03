/* CanopyOS — TextEdit: plain text + markdown editor backed by the file system */
import { fs, HOME, join, dirname, basename } from '../core/fs.js';
import { wm } from '../core/wm.js';
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, download, debounce } from '../core/util.js';
import { promptModal } from '../ui/modal.js';

function mdToHtml(text) {
  let html = escapeHtml(text);
  html = html.replace(/^```([\s\S]*?)```$/gm, '<pre class="md-code">$1</pre>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>').replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- \[x\] (.+)$/gim, '<div class="md-check done">☑ $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gim, '<div class="md-check">☐ $1</div>');
  html = html.replace(/^- (.+)$/gm, '<div class="md-li">• $1</div>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export default {
  id: 'textedit',
  name: 'TextEdit',
  icon: 'textedit',
  colors: ['#f4f6f8', '#c3cbd6'],
  iconOpts: { strokeWidth: 1.7 },
  width: 760, height: 560,
  keywords: ['editor', 'text', 'markdown', 'write', 'notepad'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New', shortcut: '⌘N', action: () => wm.open('textedit') },
      { label: 'Open…', shortcut: '⌘O', action: () => win?._openDialog() },
      { label: 'Save', shortcut: '⌘S', action: () => win?._save() },
      { label: 'Save As…', shortcut: '⇧⌘S', action: () => win?._saveAs() },
      { label: 'Export to Downloads', action: () => win?._export() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Format', items: [
      { label: 'Markdown Preview', shortcut: '⌘↩', action: () => win?._togglePreview() },
      { label: 'Monospace Font', action: () => win?._toggleFont() },
      { label: 'Bigger Text', action: () => win?._font(1) },
      { label: 'Smaller Text', action: () => win?._font(-1) },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: '⌘Z', action: () => document.execCommand('undo') },
      { label: 'Select All', shortcut: '⌘A', action: () => document.execCommand('selectAll') },
      { label: 'Insert Date', action: () => win?._insertDate() },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let path = args?.path || null;
    let dirty = false;
    let preview = false;
    let mono = false;
    let size = Number(store.get('editorFont', 13.5));
    let content = '';

    const initial = path && fs.stat(path)?.type === 'file' ? fs.read(path) : '';
    content = initial;

    root.innerHTML = `<div class="te">
      <div class="te-doc">
        <textarea class="te-body scroll-thin" spellcheck="true" placeholder="Write something…" aria-label="Document text"></textarea>
        <div class="te-preview scroll-thin md" hidden></div>
      </div>
      <div class="te-status"><span data-file>Untitled</span><span>·</span><span data-len>0 words</span><span class="spacer"></span><span data-save>Saved</span></div>
    </div>`;

    const body = root.querySelector('.te-body');
    const previewEl = root.querySelector('.te-preview');
    const fileEl = root.querySelector('[data-file]');
    const lenEl = root.querySelector('[data-len]');
    const saveEl = root.querySelector('[data-save]');

    body.value = content;
    const applyFont = () => {
      body.style.fontFamily = mono ? 'var(--mono)' : 'var(--font)';
      body.style.fontSize = `${size}px`;
      previewEl.style.fontSize = `${size}px`;
    };
    applyFont();

    const updateStatus = () => {
      const words = body.value.trim().split(/\s+/).filter(Boolean).length;
      lenEl.textContent = `${words} words · ${body.value.length} chars`;
      fileEl.textContent = path ? basename(path) : 'Untitled';
      saveEl.textContent = dirty ? 'Edited' : 'Saved';
      saveEl.style.color = dirty ? 'var(--accent)' : '';
      win.setTitle(path ? basename(path) : 'Untitled');
    };

    body.addEventListener('input', () => {
      content = body.value;
      dirty = true;
      updateStatus();
      if (preview) previewEl.innerHTML = mdToHtml(content);
      scheduleAutosave();
    });

    const scheduleAutosave = debounce(() => { if (path) doSave(true); }, 900);

    function doSave(silent = false) {
      if (!path) { win._saveAs(); return; }
      fs.write(path, content);
      dirty = false;
      updateStatus();
      if (!silent) sound.play('success');
    }

    win._save = () => doSave();
    win._saveAs = async () => {
      const name = await promptModal({ title: 'Save As', label: `Saving to ${HOME}/Documents`, value: path ? basename(path) : 'Untitled.txt', okLabel: 'Save' });
      if (!name) return;
      let dir = path ? dirname(path) : `${HOME}/Documents`;
      const target = join(dir, name);
      fs.createFile(target, content);
      path = target;
      dirty = false;
      updateStatus();
      sound.play('success');
    };
    win._export = () => download(path ? basename(path) : 'Untitled.txt', content);
    win._togglePreview = () => {
      preview = !preview;
      body.hidden = preview;
      previewEl.hidden = !preview;
      previewEl.innerHTML = mdToHtml(content);
      sound.play('click');
    };
    win._toggleFont = () => { mono = !mono; applyFont(); };
    win._font = (d) => { size = Math.max(10, Math.min(26, size + d)); store.set('editorFont', size); applyFont(); };
    win._insertDate = () => {
      const d = new Date().toLocaleString();
      const start = body.selectionStart;
      body.value = body.value.slice(0, start) + d + body.value.slice(start);
      content = body.value;
      dirty = true;
      updateStatus();
      body.focus();
    };
    win._openDialog = () => {
      const files = fs.search('').length ? [] : [];
      wm.open('finder', { args: { path: path ? dirname(path) : `${HOME}/Documents` } });
    };

    toolbar.innerHTML = `<button class="btn small no-drag" data-save>${glyph('download', 12, 2)} Save</button>
      <button class="btn small no-drag" data-prev>${glyph('eye', 12, 1.9)} Preview</button>
      <button class="btn small no-drag" data-open>${glyph('folder', 12, 1.9)} Open</button>
      <span class="spacer"></span>
      <span class="tiny muted no-drag" data-mono>${mono ? 'Monospace' : 'Serif'}</span>`;
    toolbar.querySelector('[data-save]').addEventListener('click', () => doSave());
    toolbar.querySelector('[data-prev]').addEventListener('click', () => win._togglePreview());
    toolbar.querySelector('[data-open]').addEventListener('click', () => wm.open('finder', { args: { path: `${HOME}/Documents` } }));

    win.onClose(() => { if (dirty && path) fs.write(path, content); });

    updateStatus();
    body.focus();
    body.setSelectionRange(body.value.length, body.value.length);
  },
};
