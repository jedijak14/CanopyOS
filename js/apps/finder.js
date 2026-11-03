/* CanopyOS — Finder */
import { fs, HOME, join, dirname, normalize, basename } from '../core/fs.js';
import { wm } from '../core/wm.js';
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';
import { glyph, fileIcon } from '../core/icons.js';
import { fmtShortDate, formatBytes, escapeHtml, relTime } from '../core/util.js';
import { openPath } from '../core/open.js';
import { showMenuAt } from '../ui/menu.js';
import { promptModal, confirmModal, alertModal } from '../ui/modal.js';
import { openQuickLook } from '../ui/quicklook.js';

const SIDEBAR = [
  {
    group: 'Favorites',
    items: [
      { label: 'AirDrop', icon: 'airdrop', special: 'airdrop' },
      { label: 'Recents', icon: 'clockSmall', special: 'recents' },
      { label: 'Applications', icon: 'grid', path: '/Applications' },
      { label: 'Desktop', icon: 'home', path: `${HOME}/Desktop` },
      { label: 'Documents', icon: 'doc', path: `${HOME}/Documents` },
      { label: 'Downloads', icon: 'download', path: `${HOME}/Downloads` },
      { label: 'Pictures', icon: 'image', path: `${HOME}/Pictures` },
      { label: 'Music', icon: 'music', path: `${HOME}/Music` },
      { label: 'Projects', icon: 'code', path: `${HOME}/Projects` },
    ],
  },
  { group: 'Locations', items: [{ label: 'Canopy Drive', icon: 'drive', path: '/' }, { label: 'Trash', icon: 'trash', path: '/Trash' }] },
];

const KIND_LABEL = { folder: 'Folder', txt: 'Plain Text', md: 'Markdown', js: 'JavaScript', css: 'CSS', html: 'HTML', json: 'JSON', png: 'PNG image', jpg: 'JPEG image', pdf: 'PDF Document', csv: 'CSV' };

export default {
  id: 'finder',
  name: 'Finder',
  icon: 'finder',
  colors: ['#79c4ff', '#1f6fd0'],
  width: 940,
  height: 600,
  keywords: ['files', 'folder', 'explorer', 'documents'],
  menus: (win) => [
    {
      label: 'File',
      items: [
        { label: 'New Finder Window', shortcut: '⌘N', action: () => wm.open('finder', { args: { path: win?._state?.path } }) },
        { label: 'New Folder', shortcut: '⇧⌘N', action: () => win?._newFolder() },
        { label: 'New Text File', action: () => win?._newFile() },
        { sep: true },
        { label: 'Open', shortcut: '⌘O', action: () => win?._openSelection() },
        { label: 'Quick Look', shortcut: 'Space', action: () => win?._quickLookSelection() },
        { label: 'Close Window', shortcut: '⌘W', action: () => win?.close() },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Select All', shortcut: '⌘A', action: () => win?._selectAll() },
        { label: 'Rename…', action: () => win?._renameSelection() },
        { sep: true },
        { label: 'Move to Trash', shortcut: '⌘⌫', action: () => win?._trashSelection() },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'as Icons', shortcut: '⌘1', checked: win?._state?.view === 'icons', action: () => win?._setView('icons') },
        { label: 'as List', shortcut: '⌘2', checked: win?._state?.view === 'list', action: () => win?._setView('list') },
        { label: 'as Gallery', shortcut: '⌘3', checked: win?._state?.view === 'gallery', action: () => win?._setView('gallery') },
        { sep: true },
        { label: 'Show Sidebar', checked: true, action: () => {} },
        { label: 'Toggle Hidden Files', action: () => win?._toggleHidden() },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', shortcut: '⌘[', action: () => win?._back() },
        { label: 'Forward', shortcut: '⌘]', action: () => win?._forward() },
        { label: 'Enclosing Folder', shortcut: '⌘↑', action: () => win?._up() },
        { sep: true },
        { label: 'Home', shortcut: '⇧⌘H', action: () => win?._navigate(HOME) },
        { label: 'Desktop', shortcut: '⇧⌘D', action: () => win?._navigate(`${HOME}/Desktop`) },
        { label: 'Downloads', shortcut: '⌥⌘L', action: () => win?._navigate(`${HOME}/Downloads`) },
        { label: 'Utilities', action: () => win?._navigate('/Applications') },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Minimize', shortcut: '⌘M', action: () => win?.minimize() },
        { label: 'Zoom', action: () => win?.toggleMaximize() },
        { label: 'Tile Windows', action: () => wm.tile() },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'Finder Help', action: () => alertModal({ title: 'Finder Help', body: 'Double-click folders to open them. Drag files onto folders to move them. Press Space for Quick Look, ⌘⌫ to move items to the Trash. Use the search field to search this folder and everything inside it.', art: 'info' }) }],
    },
  ],

  mount({ root, toolbar, win, args }) {
    const state = {
      path: args?.path || HOME,
      history: [],
      hIndex: -1,
      view: store.get('finderView', 'icons'),
      sort: store.get('finderSort', 'name'),
      sortDir: 1,
      selection: new Set(),
      query: '',
      showHidden: false,
    };
    win._state = state;

    if (!fs.isDir(state.path)) state.path = dirname(state.path);
    root.innerHTML = `<div class="finder">
      <aside class="fn-sidebar"></aside>
      <section class="fn-main">
        <div class="fn-pathbar"></div>
        <div class="fn-content scroll-thin"></div>
        <div class="fn-status"></div>
      </section>
    </div>`;

    const sidebar = root.querySelector('.fn-sidebar');
    const pathbar = root.querySelector('.fn-pathbar');
    const content = root.querySelector('.fn-content');
    const status = root.querySelector('.fn-status');

    /* ---------- toolbar ---------- */
    toolbar.innerHTML = `
      <div class="hstack" style="gap:2px">
        <button class="icon-btn no-drag" data-nav="back" title="Back">${glyph('chevronLeft', 16, 2)}</button>
        <button class="icon-btn no-drag" data-nav="forward" title="Forward">${glyph('chevronRight', 16, 2)}</button>
      </div>
      <span class="fn-toolbar-title" data-title></span>
      <span class="spacer"></span>
      <div class="seg no-drag" role="group" aria-label="View">
        <button data-view="icons" title="Icon view">${glyph('grid', 14, 1.8)}</button>
        <button data-view="list" title="List view">${glyph('list', 14, 1.8)}</button>
        <button data-view="gallery" title="Gallery view">${glyph('image', 14, 1.8)}</button>
      </div>
      <button class="icon-btn no-drag" data-act="sort" title="Sort">${glyph('filter', 15, 1.8)}</button>
      <button class="icon-btn no-drag" data-act="newfolder" title="New Folder">${glyph('plusCircle', 16, 1.7)}</button>
      <label class="fn-search no-drag">${glyph('search', 13, 2)}<input type="search" placeholder="Search" aria-label="Search folder" /></label>`;

    const titleEl = toolbar.querySelector('[data-title]');
    const searchInput = toolbar.querySelector('.fn-search input');

    toolbar.querySelector('[data-nav="back"]').addEventListener('click', () => win._back());
    toolbar.querySelector('[data-nav="forward"]').addEventListener('click', () => win._forward());
    toolbar.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => win._setView(b.dataset.view)));
    toolbar.querySelector('[data-act="newfolder"]').addEventListener('click', () => win._newFolder());
    toolbar.querySelector('[data-act="sort"]').addEventListener('click', (e) => {
      showMenuAt(...[e.clientX, e.clientY], [
        { label: 'Name', checked: state.sort === 'name', action: () => { state.sort = 'name'; store.set('finderSort', 'name'); render(); } },
        { label: 'Kind', checked: state.sort === 'kind', action: () => { state.sort = 'kind'; store.set('finderSort', 'kind'); render(); } },
        { label: 'Date Modified', checked: state.sort === 'date', action: () => { state.sort = 'date'; store.set('finderSort', 'date'); render(); } },
        { label: 'Size', checked: state.sort === 'size', action: () => { state.sort = 'size'; store.set('finderSort', 'size'); render(); } },
        { sep: true },
        { label: state.sortDir === 1 ? 'Ascending' : 'Descending', action: () => { state.sortDir *= -1; render(); } },
      ]);
    });
    searchInput.addEventListener('input', () => { state.query = searchInput.value; render(); });

    /* ---------- data ---------- */
    function items() {
      let list;
      if (state.query.trim()) {
        list = fs.search(state.query)
          .filter((r) => r.path.startsWith(state.path + '/') || r.path === state.path)
          .map((r) => ({ node: r.node, path: r.path, name: r.node.name, type: r.node.type }));
      } else {
        list = fs.list(state.path);
      }
      if (!state.showHidden) list = list.filter((i) => !i.name.startsWith('.'));
      const dir = state.sortDir;
      return list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        if (state.sort === 'kind') return a.node.type.localeCompare(b.node.type) * dir || a.name.localeCompare(b.name);
        if (state.sort === 'date') return ((a.node.meta?.modified || 0) - (b.node.meta?.modified || 0)) * dir;
        if (state.sort === 'size') return ((a.node.content?.length || 0) - (b.node.content?.length || 0)) * dir;
        return a.name.localeCompare(b.name) * dir;
      });
    }

    function navigate(path, push = true) {
      const p = normalize(path);
      if (!fs.exists(p)) return;
      const node = fs.stat(p);
      if (node.type !== 'folder') { openPath(p); return; }
      state.path = p;
      state.selection.clear();
      state.query = '';
      searchInput.value = '';
      if (push) {
        state.history = state.history.slice(0, state.hIndex + 1);
        state.history.push(p);
        state.hIndex = state.history.length - 1;
      }
      render();
      sound.play('click');
    }
    win._navigate = navigate;
    win._back = () => { if (state.hIndex > 0) { state.hIndex--; state.path = state.history[state.hIndex]; state.selection.clear(); render(); } };
    win._forward = () => { if (state.hIndex < state.history.length - 1) { state.hIndex++; state.path = state.history[state.hIndex]; state.selection.clear(); render(); } };
    win._up = () => navigate(dirname(state.path));
    win._setView = (v) => { state.view = v; store.set('finderView', v); render(); };
    win._toggleHidden = () => { state.showHidden = !state.showHidden; render(); };
    win._selectAll = () => { items().forEach((i) => state.selection.add(i.path)); render(); };
    win._openSelection = () => { const first = [...state.selection][0]; if (first) openPath(first); };
    win._quickLookSelection = () => { const first = [...state.selection][0]; if (first) openQuickLook(first); };
    win._trashSelection = async () => {
      if (!state.selection.size) return;
      const many = state.selection.size > 1;
      if (store.get('confirms')) {
        const ok = await confirmModal({ title: many ? `Move ${state.selection.size} items to the Trash?` : `Move "${basename([...state.selection][0])}" to the Trash?`, body: 'You can restore items from the Trash.', okLabel: 'Move to Trash' });
        if (!ok) return;
      }
      [...state.selection].forEach((p) => fs.remove(p, { trash: true }));
      state.selection.clear();
      sound.play('trash');
      render();
    };
    win._renameSelection = async () => {
      const path = [...state.selection][0];
      if (!path) return;
      const name = await promptModal({ title: 'Rename', value: basename(path), okLabel: 'Rename' });
      if (!name) return;
      try { fs.rename(path, name); state.selection = new Set([join(dirname(path), name)]); render(); }
      catch (err) { alertModal({ title: 'Could not rename', body: err.message, art: 'warning' }); }
    };
    win._newFolder = async () => {
      const name = await promptModal({ title: 'New Folder', value: 'Untitled Folder', okLabel: 'Create' });
      if (!name) return;
      try {
        const p = join(state.path, name);
        fs.mkdir(p);
        state.selection = new Set([p]);
        render();
        sound.play('success');
      } catch (err) { alertModal({ title: 'Could not create folder', body: err.message, art: 'warning' }); }
    };
    win._newFile = () => {
      let name = 'Untitled.txt';
      let i = 2;
      while (fs.exists(join(state.path, name))) name = `Untitled ${i++}.txt`;
      fs.createFile(join(state.path, name), '');
      render();
    };

    /* ---------- sidebar ---------- */
    function renderSidebar() {
      sidebar.innerHTML = SIDEBAR.map((g) => `<div class="fn-group">${g.group}</div>
        ${g.items.map((it) => {
          const active = it.path && normalize(it.path) === normalize(state.path);
          const count = it.special === 'recents' ? 0 : 0;
          return `<button class="fn-side-item ${active ? 'active' : ''}" data-path="${it.path || ''}" data-special="${it.special || ''}">
            <span class="fn-side-ico">${glyph(it.icon, 14, 1.8)}</span><span>${it.label}</span>${count ? `<span class="fn-side-count">${count}</span>` : ''}
          </button>`;
        }).join('')}`).join('') +
        `<div class="fn-group">Tags</div>
         <div class="fn-tags">${['Work', 'Personal', 'Errands'].map((t) => `<button class="fn-tag" data-tag="${t}"><i></i>${t}</button>`).join('')}</div>
         <div class="fn-side-foot">${(store.get('userName') || 'Canopy User')} · ${formatBytes(512 * 1024 * 1024 * 1024 - fs.stats().bytes)} free</div>`;

      sidebar.querySelectorAll('[data-path]').forEach((b) => {
        b.addEventListener('click', () => {
          if (b.dataset.special === 'airdrop') {
            alertModal({ title: 'AirDrop', body: 'No nearby devices found. AirDrop in CanopyOS is a simulation — enable it in Control Center and nearby devices will appear here.', art: 'airdrop' });
            return;
          }
          if (b.dataset.path) navigate(b.dataset.path);
        });
      });
      sidebar.querySelectorAll('[data-tag]').forEach((b) => {
        b.addEventListener('click', () => { state.query = b.dataset.tag; searchInput.value = b.dataset.tag; render(); });
      });
    }

    function crumbs() {
      const parts = state.path.split('/').filter(Boolean);
      let acc = '';
      const nodes = parts.map((p, i) => {
        acc += '/' + p;
        const label = p === 'canopy' ? (store.get('userName')?.split(' ')[0] || 'canopy') : p;
        return `<button class="fn-crumb" data-crumb="${acc}">${i === 0 ? glyph('drive', 12, 1.8) : ''}${escapeHtml(label)}</button>`;
      });
      return `<div class="fn-crumbs">${nodes.join('<span class="fn-crumb-sep">›</span>')}</div>`;
    }

    /* ---------- render ---------- */
    function render() {
      const list = items();
      const node = fs.stat(state.path);
      titleEl.textContent = basename(state.path) || 'Canopy Drive';
      win.setTitle(basename(state.path) === 'canopy' ? 'Home' : basename(state.path) || 'Canopy Drive');
      renderSidebar();
      pathbar.innerHTML = `${crumbs()}<span class="spacer"></span>${state.path === '/Trash' ? '<button class="btn small" data-empty-trash>Empty</button>' : ''}${pathbarExtra()}`;
      pathbar.querySelectorAll('[data-crumb]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.crumb)));
      pathbar.querySelector('[data-empty-trash]')?.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Empty the Trash?', body: 'This permanently deletes all items in the Trash.', okLabel: 'Empty Trash' });
        if (ok) { fs.emptyTrash(); sound.play('trash'); render(); }
      });

      toolbar.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === state.view));

      if (!list.length) {
        content.className = 'fn-content scroll-thin';
        content.innerHTML = `<div class="empty-state">${glyph(state.query ? 'search' : 'folder', 40)}<div>${state.query ? `No results for “${escapeHtml(state.query)}”` : 'This folder is empty'}</div></div>`;
      } else if (state.view === 'icons') {
        content.className = 'fn-content scroll-thin fn-icons';
        content.innerHTML = list.map((it) => iconTile(it)).join('');
      } else if (state.view === 'list') {
        content.className = 'fn-content scroll-thin fn-list';
        content.innerHTML = `<div class="fn-list-head">
            <span data-col="name">Name ${colArrow('name')}</span><span data-col="date">Date Modified ${colArrow('date')}</span><span data-col="size">Size ${colArrow('size')}</span><span data-col="kind">Kind ${colArrow('kind')}</span>
          </div>` + list.map((it) => listRow(it)).join('');
        content.querySelectorAll('[data-col]').forEach((h) => h.addEventListener('click', () => {
          const col = h.dataset.col;
          if (state.sort === col) state.sortDir *= -1;
          else { state.sort = col; state.sortDir = 1; }
          render();
        }));
      } else {
        const sel = [...state.selection][0] || list[0]?.path;
        const selNode = sel ? fs.stat(sel) : null;
        content.className = 'fn-content fn-gallery-wrap';
        content.innerHTML = `<div class="fn-gallery">
          <div class="fn-gallery-main">${selNode ? galleryPreview(selNode, sel) : ''}</div>
          <div class="fn-gallery-strip">${list.map((it) => `<button class="fn-gallery-thumb ${sel === it.path ? 'on' : ''}" data-path="${it.path}">
            <div style="width:38px;height:38px;margin:auto">${fileIcon(it.node)}</div><span>${escapeHtml(it.name)}</span></button>`).join('')}</div>
        </div>`;
      }

      bindItems();
      status.innerHTML = `<span>${list.length} item${list.length === 1 ? '' : 's'}${state.selection.size ? ` · ${state.selection.size} selected` : ''}</span><span class="spacer"></span><span>${state.query ? 'Search results' : `${formatBytes(node?.children?.reduce((s, c) => s + (c.content?.length || 0), 0) || 0)}`}</span>`;
    }

    function colArrow(col) {
      return state.sort === col ? (state.sortDir === 1 ? '↑' : '↓') : '';
    }

    function pathbarExtra() {
      if (state.path !== '/Applications') return '';
      return `<span class="tiny muted">${(wm.registry ? [...wm.registry.values()].length : 0)} apps installed</span>`;
    }

    function iconTile(it) {
      const selected = state.selection.has(it.path);
      return `<button class="fn-tile ${selected ? 'sel' : ''}" data-path="${it.path}" draggable="true">
        <div class="fn-tile-art">${fileIcon(it.node)}</div>
        <div class="fn-tile-name">${escapeHtml(it.name)}</div>
        ${it.node.meta?.tags?.length ? `<div class="fn-tile-tag">${escapeHtml(it.node.meta.tags[0])}</div>` : ''}
      </button>`;
    }

    function listRow(it) {
      const selected = state.selection.has(it.path);
      const size = it.node.type === 'folder' ? `${it.node.children.length} items` : formatBytes((it.node.content || '').length);
      const kind = it.node.type === 'folder' ? 'Folder' : (KIND_LABEL[(it.name.split('.').pop() || '').toLowerCase()] || 'Document');
      return `<div class="fn-row ${selected ? 'sel' : ''}" data-path="${it.path}" draggable="true">
        <span class="fn-row-name"><span class="fn-row-ico">${fileIcon(it.node)}</span><span class="fn-ellipsis">${escapeHtml(it.name)}</span></span>
        <span class="muted">${fmtShortDate(new Date(it.node.meta?.modified || Date.now()))}</span>
        <span class="muted">${size}</span>
        <span class="muted">${kind}</span>
      </div>`;
    }

    function galleryPreview(node, path) {
      const dataUrl = node.meta?.dataUrl;
      if (node.type === 'folder') {
        const kids = fs.list(path);
        return `<div class="fn-gallery-folder"><div style="width:86px;height:86px">${fileIcon(node)}</div><h3>${escapeHtml(node.name)}</h3><div class="muted tiny">${kids.length} items · ${fmtShortDate(new Date(node.meta.modified))}</div></div>`;
      }
      if (dataUrl) return `<img src="${dataUrl}" alt="${escapeHtml(node.name)}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px" />`;
      if (node.meta?.art) return `<div style="width:70%;height:70%;border-radius:12px;background:linear-gradient(135deg,${node.meta.art[0]},${node.meta.art[1]})"></div>`;
      return `<pre class="fn-gallery-text selectable">${escapeHtml((node.content || '').slice(0, 900))}</pre>`;
    }

    function bindItems() {
      content.querySelectorAll('[data-path]').forEach((el) => {
        const path = el.dataset.path;
        el.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (e.metaKey || e.ctrlKey) {
            if (state.selection.has(path)) state.selection.delete(path);
            else state.selection.add(path);
          } else if (!state.selection.has(path)) {
            state.selection = new Set([path]);
          }
          content.querySelectorAll('.sel').forEach((s) => s.classList.remove('sel'));
          state.selection.forEach((p) => content.querySelectorAll(`[data-path="${CSS.escape(p)}"]`).forEach((s) => s.classList.add('sel')));
          if (state.view === 'gallery') render();
        });
        el.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          if (el.draggable && e.target.closest('.fn-row, .fn-tile')) return;
          openItem(path);
        });
        el.addEventListener('click', (e) => {
          if (state.view === 'gallery' && el.classList.contains('fn-gallery-thumb')) { state.selection = new Set([path]); render(); }
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!state.selection.has(path)) state.selection = new Set([path]);
          itemMenu(path, e.clientX, e.clientY);
        });
        el.addEventListener('dragover', (e) => {
          const src = e.dataTransfer?.types?.includes('text/canopy-path');
          if (!src) return;
          const node = fs.stat(path);
          if (node?.type === 'folder') { e.preventDefault(); el.classList.add('drop-target'); }
        });
        el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          el.classList.remove('drop-target');
          const src = e.dataTransfer.getData('text/canopy-path');
          if (src && fs.stat(src)?.type) { fs.move(src, path); sound.play('pop'); render(); }
        });
        if (el.draggable) {
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/canopy-path', path);
            e.dataTransfer.effectAllowed = 'move';
          });
        }
      });
      content.addEventListener('click', (e) => {
        if (e.target.closest('[data-path]')) return;
        state.selection.clear();
        content.querySelectorAll('.sel').forEach((s) => s.classList.remove('sel'));
      });
    }

    function openItem(path) {
      const node = fs.stat(path);
      if (!node) return;
      if (node.type === 'folder') navigate(path);
      else openPath(path);
    }

    function itemMenu(path, x, y) {
      const node = fs.stat(path);
      const many = state.selection.size > 1;
      showMenuAt(x, y, [
        { label: 'Open', action: () => openItem(path) },
        { label: 'Quick Look', shortcut: 'Space', action: () => openQuickLook(path) },
        { label: 'Open With Preview', disabled: node?.type === 'folder', action: () => wm.open('preview', { args: { path } }) },
        { label: 'Open With TextEdit', disabled: node?.type === 'folder', action: () => wm.open('textedit', { args: { path } }) },
        { sep: true },
        { label: 'Duplicate', action: () => { fs.copy(path, state.path); render(); } },
        { label: 'Rename…', action: () => win._renameSelection() },
        { label: 'Compress', action: () => { fs.createFile(join(state.path, node.name + '.zip'), 'PK\\x03\\x04 simulated archive', { kind: 'archive' }); render(); } },
        { sep: true },
        { label: 'Move to Trash', action: async () => { if (many) win._trashSelection(); else { fs.remove(path, { trash: true }); state.selection.clear(); render(); } } },
        { sep: true },
        { label: 'Get Info', action: () => infoModal(path) },
        { label: 'Add Tag…', action: async () => {
          const tag = await promptModal({ title: 'Add Tag', value: 'Work', label: 'Tag name' });
          if (tag && node) { node.meta.tags = [...new Set([...(node.meta.tags || []), tag])]; fs.persist(); fs.emit('meta', path); render(); }
        } },
      ]);
    }

    function infoModal(path) {
      const node = fs.stat(path);
      const isFile = node.type === 'file';
      alertModal({
        title: node.name,
        art: '',
        okLabel: 'Done',
        body: `<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px"><div style="width:54px;height:54px">${fileIcon(node)}</div>
        <div><b style="color:var(--text)">${escapeHtml(node.name)}</b><div class="tiny muted">${isFile ? (KIND_LABEL[(node.name.split('.').pop() || '').toLowerCase()] || 'Document') : 'Folder'}</div></div></div>
        <div class="tiny" style="line-height:1.9">
          <div><b style="color:var(--text)">Where</b> &nbsp; ${dirname(path)}</div>
          <div><b style="color:var(--text)">Size</b> &nbsp; ${isFile ? formatBytes((node.content || '').length) : `${node.children.length} items`}</div>
          <div><b style="color:var(--text)">Created</b> &nbsp; ${new Date(node.meta.created).toLocaleString()}</div>
          <div><b style="color:var(--text)">Modified</b> &nbsp; ${relTime(node.meta.modified)}</div>
        </div>`,
      });
    }

    /* ---------- keyboard ---------- */
    const keyHandler = (e) => {
      if (!root.isConnected) { document.removeEventListener('keydown', keyHandler); return; }
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      const focused = wm.focused();
      if (focused?.id !== win.id) return;
      const all = items();
      const current = [...state.selection][0];
      const idx = all.findIndex((i) => i.path === current);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = all[Math.min(all.length - 1, idx + 1)];
        if (next) { state.selection = new Set([next.path]); render(); }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = all[Math.max(0, idx - 1)];
        if (prev) { state.selection = new Set([prev.path]); render(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (current) openItem(current);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (current) openQuickLook(current);
      } else if ((e.key === 'Backspace' || (e.metaKey && e.key === 'Backspace'))) {
        e.preventDefault();
        win._trashSelection();
      } else if (e.key === 'F2') {
        e.preventDefault();
        win._renameSelection();
      }
    };
    document.addEventListener('keydown', keyHandler);

    const fsHandler = () => render();
    window.addEventListener('canopy:fs', fsHandler);
    win.onClose(() => {
      document.removeEventListener('keydown', keyHandler);
      window.removeEventListener('canopy:fs', fsHandler);
    });

    if (state.path === '/Applications') state.view = 'icons';
    state.history = [state.path];
    state.hIndex = 0;
    render();
  },
};
