/* CanopyOS — Preview: documents, markdown and images */
import { fs, HOME, dirname, basename, ext } from '../core/fs.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { glyph, fileIcon } from '../core/icons.js';
import { escapeHtml, formatBytes, download } from '../core/util.js';

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
  html = html.replace(/^\|(.+)\|$/gm, (m) => `<div class="md-row">${m}</div>`);
  html = html.replace(/\n/g, '<br>');
  return html;
}

export default {
  id: 'preview',
  name: 'Preview',
  icon: 'preview',
  colors: ['#e8edf2', '#a9b6c4'],
  iconOpts: { strokeWidth: 1.7 },
  width: 820, height: 640,
  keywords: ['pdf', 'image viewer', 'document', 'read'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'Open in TextEdit', action: () => win?._openEditor() },
      { label: 'Export…', action: () => win?._export() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'View', items: [
      { label: 'Zoom In', shortcut: '⌘+', action: () => win?._zoom(0.1) },
      { label: 'Zoom Out', shortcut: '⌘-', action: () => win?._zoom(-0.1) },
      { label: 'Actual Size', action: () => win?._zoomReset() },
      { label: 'Show Sidebar', action: () => win?._toggleSidebar() },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let path = args?.path && fs.exists(args.path) ? args.path : null;
    let zoom = 1;
    let sidebar = true;
    let page = 1;

    root.innerHTML = `<div class="preview">
      <aside class="preview-side" data-side></aside>
      <section class="preview-main scroll-thin" data-main></section>
      <div class="preview-status"><span data-name>No document</span><span class="spacer"></span><span data-meta></span></div>
    </div>`;

    const sideEl = root.querySelector('[data-side]');
    const mainEl = root.querySelector('[data-main]');
    const nameEl = root.querySelector('[data-name]');
    const metaEl = root.querySelector('[data-meta]');

    function pagesFor(node) {
      const text = node.content || '';
      if (node.meta?.dataUrl) return [{ label: '1', html: `<img src="${node.meta.dataUrl}" alt="${escapeHtml(node.name)}" style="width:100%;border-radius:4px">` }];
      if (node.type === 'folder') return [{ label: 'Folder', html: `<div class="empty-state">${glyph('folder', 40)}<div>${escapeHtml(node.name)}</div></div>` }];
      const isMd = ext(node.name) === 'md';
      const chunks = text.split(/\n\s*\n/);
      const pages = [];
      let current = [];
      let len = 0;
      chunks.forEach((chunk) => {
        current.push(chunk);
        len += chunk.length;
        if (len > 1400) { pages.push(current.join('\n\n')); current = []; len = 0; }
      });
      if (current.length || !pages.length) pages.push(current.join('\n\n'));
      return pages.map((content, i) => ({ label: String(i + 1), html: isMd ? `<div class="md preview-md">${mdToHtml(content)}</div>` : `<pre class="preview-text selectable">${escapeHtml(content)}</pre>` }));
    }

    function render() {
      const node = path ? fs.stat(path) : null;
      win.setTitle(node ? `${node.name} — Preview` : 'Preview');
      nameEl.textContent = node ? node.name : 'No document selected';
      metaEl.textContent = node ? `${node.type === 'folder' ? `${node.children.length} items` : formatBytes((node.content || '').length)} · ${node.type}` : '';

      if (!node) {
        sideEl.innerHTML = '';
        mainEl.innerHTML = `${filePicker()}`;
        bindPicker();
        return;
      }
      const pages = pagesFor(node);
      page = Math.min(page, pages.length);
      sideEl.style.display = sidebar ? '' : 'none';
      sideEl.innerHTML = `<div class="preview-side-title">${pages.length} page${pages.length === 1 ? '' : 's'}</div>
        <div class="preview-thumbs">${pages.map((p, i) => `<button class="preview-thumb ${page === i + 1 ? 'on' : ''}" data-page="${i + 1}">
          <span class="preview-thumb-art"></span><span>${p.label}</span></button>`).join('')}</div>
        <div class="preview-side-meta tiny muted">
          <div>${escapeHtml(basename(dirname(path)) || '/')}</div>
          <div>Modified ${new Date(node.meta.modified).toLocaleDateString()}</div>
        </div>`;
      sideEl.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => { page = Number(b.dataset.page); render(); }));
      mainEl.innerHTML = `<div class="preview-paper" style="width:${Math.round(zoom * 100)}%">${pages[page - 1]?.html || ''}</div>`;
      toolbar.querySelector('[data-zoom-label]').textContent = `${Math.round(zoom * 100)}%`;
    }

    function filePicker() {
      const docs = [...fs.list(`${HOME}/Documents`), ...fs.list(`${HOME}/Desktop`)];
      return `<div class="preview-empty"><div class="empty-state">${glyph('preview', 46)}<div><b>Preview</b><br><span class="tiny">Open a document to read it here</span></div></div>
        <div class="set-group"><div class="set-group-title">Recent Documents</div><div class="set-group-body">
        ${docs.map((d) => `<button class="preview-pick" data-open="${d.path}"><span style="width:24px;height:24px">${fileIcon(d.node)}</span><span>${escapeHtml(d.name)}</span><span class="tiny muted">${formatBytes((d.node.content || '').length)}</span></button>`).join('')}
        </div></div></div>`;
    }

    function bindPicker() {
      mainEl.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { path = b.dataset.open; page = 1; render(); }));
    }

    win._openEditor = () => { if (path) wm.open('textedit', { args: { path } }); };
    win._export = () => {
      const node = path && fs.stat(path);
      if (!node) return;
      if (node.meta?.dataUrl) {
        const a = document.createElement('a');
        a.href = node.meta.dataUrl;
        a.download = node.name;
        a.click();
      } else download(node.name, node.content || '');
    };
    win._zoom = (d) => { zoom = Math.max(0.5, Math.min(2.5, zoom + d)); render(); };
    win._zoomReset = () => { zoom = 1; render(); };
    win._toggleSidebar = () => { sidebar = !sidebar; render(); };

    toolbar.innerHTML = `<span class="fn-toolbar-title" data-tname></span><span class="spacer"></span>
      <button class="icon-btn no-drag" data-zm title="Zoom out">${glyph('minus', 14, 2)}</button>
      <span class="tiny no-drag" data-zoom-label style="min-width:34px;text-align:center">100%</span>
      <button class="icon-btn no-drag" data-zp title="Zoom in">${glyph('plus', 14, 2)}</button>
      <button class="icon-btn no-drag" data-openfile title="Open">${glyph('folder', 15, 1.8)}</button>
      <button class="icon-btn no-drag" data-edit title="Edit">${glyph('textedit', 15, 1.8)}</button>
      <button class="icon-btn no-drag" data-share title="Export">${glyph('share', 15, 1.8)}</button>`;
    toolbar.querySelector('[data-zm]').addEventListener('click', () => win._zoom(-0.1));
    toolbar.querySelector('[data-zp]').addEventListener('click', () => win._zoom(0.1));
    toolbar.querySelector('[data-edit]').addEventListener('click', () => win._openEditor());
    toolbar.querySelector('[data-share]').addEventListener('click', () => win._export());
    toolbar.querySelector('[data-openfile]').addEventListener('click', () => wm.open('finder', { args: { path: `${HOME}/Documents` } }));

    root.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      win._zoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });

    render();
  },
};
