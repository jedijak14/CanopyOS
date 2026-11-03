/* CanopyOS — Canopy Browser: tabs, internal pages, file:// previews */
import { fs } from '../core/fs.js';
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph, appIcon } from '../core/icons.js';
import { escapeHtml, uid, relTime } from '../core/util.js';
import { alertModal } from '../ui/modal.js';

export default {
  id: 'browser',
  name: 'Canopy Browser',
  icon: 'browser',
  colors: ['#5ac8fa', '#0a63c9'],
  width: 1000, height: 680,
  keywords: ['web', 'internet', 'safari', 'browse', 'url'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Tab', shortcut: '⌘T', action: () => win?._newTab() },
      { label: 'Add Bookmark', shortcut: '⌘D', action: () => win?._bookmark() },
      { label: 'Close Tab', shortcut: '⌘W', action: () => win?._closeTab() },
    ] },
    { label: 'View', items: [
      { label: 'Home', action: () => win?._go('canopy://home') },
      { label: 'Bookmarks', action: () => win?._go('canopy://bookmarks') },
      { label: 'History', action: () => win?._go('canopy://history') },
      { sep: true },
      { label: 'Reload', action: () => win?._reload() },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let tabs = [];
    let active = 0;
    let history = data.get('browserHistory', []);

    function newTab(url = 'canopy://home', push = true) {
      const tab = { id: uid('tab'), url, title: 'New Tab', stack: [url], index: 0 };
      tabs.push(tab);
      active = tabs.length - 1;
      if (push) load();
      return tab;
    }
    const tab = () => tabs[active];

    root.innerHTML = `<div class="browser">
      <div class="browser-tabs" data-tabs></div>
      <div class="browser-view" data-view></div>
      <div class="browser-status"><span data-status>Ready</span><span class="spacer"></span><span data-tabsinfo></span></div>
    </div>`;

    const tabsEl = root.querySelector('[data-tabs]');
    const viewEl = root.querySelector('[data-view]');
    const statusEl = root.querySelector('[data-status]');

    function renderTabs() {
      tabsEl.innerHTML = tabs.map((t, i) => `<button class="browser-tab ${i === active ? 'active' : ''}" data-tab="${i}">
        <span>${escapeHtml(t.title)}</span><button class="browser-tab-x" data-close="${i}" aria-label="Close tab">✕</button>
      </button>`).join('') + `<button class="browser-tab-new" data-newtab title="New tab">${glyph('plus', 13, 2.2)}</button>`;
      tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) return;
        active = Number(b.dataset.tab);
        load();
      }));
      tabsEl.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        active = Number(b.dataset.close);
        win._closeTab();
      }));
      tabsEl.querySelector('[data-newtab]').addEventListener('click', () => win._newTab());
    }

    function navigate(url, push = true) {
      const t = tab();
      if (!t) return;
      if (url && url !== t.url) {
        t.stack = t.stack.slice(0, t.index + 1);
        t.stack.push(url);
        t.index = t.stack.length - 1;
      }
      t.url = url;
      if (push) {
        history = [{ id: uid('h'), url, title: url, ts: Date.now() }, ...history.filter((h) => h.url !== url)].slice(0, 40);
        data.set('browserHistory', history);
      }
      load();
    }

    function normalize(input) {
      const v = input.trim();
      if (!v) return 'canopy://home';
      if (/^(https?:\/\/|file:\/\/|canopy:\/\/)/.test(v)) return v;
      if (v.startsWith('/')) return `file://${v}`;
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
      return `canopy://search?q=${encodeURIComponent(v)}`;
    }

    function load() {
      const t = tab();
      if (!t) return;
      const view = decodeView(t.url);
      renderTabs();
      updateToolbar();
      if (view.kind === 'iframe') {
        viewEl.innerHTML = `<div class="browser-frame-wrap"><iframe src="${escapeHtml(view.url)}" title="Web content" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
          <div class="browser-frame-note">${glyph('info', 14, 1.9)} Many sites block being embedded. If the page stays blank, <a href="${escapeHtml(view.url)}" target="_blank" rel="noopener">open it in a new browser tab</a>.</div></div>`;
        t.title = view.host;
        renderTabs();
        statusEl.textContent = `Loaded ${view.host}`;
        return;
      }
      viewEl.innerHTML = `<div class="browser-page scroll-thin">${view.html}</div>`;
      t.title = view.title;
      bindPage(view);
      renderTabs();
      updateToolbar();
      statusEl.textContent = view.title;
      win.setTitle(`${view.title} — Browser`);
    }

    function updateToolbar() {
      const t = tab();
      if (!t) return;
      toolbar.innerHTML = `<div class="hstack" style="gap:2px">
        <button class="icon-btn no-drag" data-back title="Back">${glyph('chevronLeft', 15, 2)}</button>
        <button class="icon-btn no-drag" data-fwd title="Forward">${glyph('chevronRight', 15, 2)}</button>
        <button class="icon-btn no-drag" data-reload title="Reload">${glyph('refresh', 14, 1.9)}</button>
      </div>
      <label class="browser-url no-drag">${glyph('lock', 12, 2)}<input type="text" value="${escapeHtml(t.url)}" data-url aria-label="Address" spellcheck="false" /></label>
      <button class="icon-btn no-drag" data-bookmark title="Bookmark">${glyph('star', 15, 1.8)}</button>
      <button class="icon-btn no-drag" data-share title="Open externally">${glyph('share', 15, 1.8)}</button>`;
      const input = toolbar.querySelector('[data-url]');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); navigate(normalize(input.value)); }
      });
      input.addEventListener('focus', () => input.select());
      toolbar.querySelector('[data-back]').addEventListener('click', () => {
        if (t.index > 0) { t.index--; t.url = t.stack[t.index]; load(); }
      });
      toolbar.querySelector('[data-fwd]').addEventListener('click', () => {
        if (t.index < t.stack.length - 1) { t.index++; t.url = t.stack[t.index]; load(); }
      });
      toolbar.querySelector('[data-reload]').addEventListener('click', () => load());
      toolbar.querySelector('[data-bookmark]').addEventListener('click', () => win._bookmark());
      toolbar.querySelector('[data-share]').addEventListener('click', () => {
        if (t.url.startsWith('http')) window.open(t.url, '_blank', 'noopener');
        else alertModal({ title: 'Share', body: `Copy this address to share it:<br><code class="mono tiny">${escapeHtml(t.url)}</code>`, art: 'share' });
      });
    }

    function decodeView(url) {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        try { return { kind: 'iframe', url, host: new URL(url).host }; } catch (e) { return { kind: 'iframe', url, host: url }; }
      }
      if (url.startsWith('file://')) return fileView(url.replace('file://', ''));
      if (url.startsWith('canopy://search')) {
        const q = decodeURIComponent(url.split('q=')[1] || '');
        return searchView(q);
      }
      if (url === 'canopy://bookmarks') return bookmarksView();
      if (url === 'canopy://history') return historyView();
      if (url === 'canopy://about') return aboutView();
      return homeView();
    }

    function fileView(path) {
      const node = fs.stat(path);
      if (!node) return { kind: 'iframe', url: `about:blank`, title: 'Not Found', html: '' };
      if (node.type === 'folder') {
        return {
          kind: 'page', title: node.name, path,
          html: `<div class="bp-file"><h1>${escapeHtml(node.name)}</h1><p class="muted">${node.children.length} items</p>
            <ul>${fs.list(path).map((i) => `<li><a href="#" data-open="${i.path}">${escapeHtml(i.name)}</a></li>`).join('')}</ul></div>`,
        };
      }
      const isHtml = /\.html?$/.test(node.name);
      if (isHtml) {
        return { kind: 'iframe', url: `about:blank`, host: node.name, html: '' };
      }
      return {
        kind: 'page', title: node.name, path, file: path,
        html: `<div class="bp-file"><h1>${escapeHtml(node.name)}</h1><pre>${escapeHtml((node.content || '').slice(0, 20000))}</pre></div>`,
      };
    }

    function homeView() {
      const bookmarks = data.get('bookmarks', []);
      return {
        kind: 'page', title: 'Start Page',
        html: `<div class="bp-home">
          <div class="bp-hero">
            <div class="bp-logo">${appIcon('canopy', ['#34e0a1', '#0a6e77'])}</div>
            <h1>Canopy Browser</h1>
            <p>A calm place to start. Everything here is local — no trackers, no cookies, no analytics.</p>
            <form class="bp-search" data-search-form><input type="search" placeholder="Search the web or enter a URL" aria-label="Search" data-q /><button class="btn primary">Search</button></form>
          </div>
          <div class="bp-favorites">
            ${bookmarks.map((b) => `<a class="bp-fav" href="${escapeHtml(b.url)}" data-nav="${escapeHtml(b.url)}"><span>${glyph('globe', 20, 1.7)}</span><b>${escapeHtml(b.title)}</b><small>${escapeHtml(new URL(b.url).host)}</small></a>`).join('')}
            <a class="bp-fav" href="canopy://bookmarks" data-nav="canopy://bookmarks"><span>${glyph('star', 20, 1.7)}</span><b>Bookmarks</b><small>Saved pages</small></a>
            <a class="bp-fav" href="canopy://history" data-nav="canopy://history"><span>${glyph('clockSmall', 20, 1.7)}</span><b>History</b><small>Recently visited</small></a>
            <a class="bp-fav" href="canopy://about" data-nav="canopy://about"><span>${glyph('info', 20, 1.7)}</span><b>About</b><small>How this works</small></a>
          </div>
          <div class="bp-note tiny muted">Canopy Browser renders local pages itself. External websites load in a sandboxed frame and may refuse embedding.</div>
        </div>`,
      };
    }

    function searchView(q) {
      return {
        kind: 'page', title: `Search — ${q}`,
        html: `<div class="bp-results">
          <div class="bp-search-top"><form class="bp-search" data-search-form><input type="search" value="${escapeHtml(q)}" data-q aria-label="Search" /><button class="btn primary">Search</button></form></div>
          <div class="tiny muted" style="margin:10px 0 18px">Showing local results for “${escapeHtml(q)}”. CanopyOS does not send your searches anywhere.</div>
          ${[
            ['CanopyOS documentation', 'canopy://about', 'Guides, shortcuts and the plugin API for CanopyOS.'],
            ['MDN Web Docs', 'https://developer.mozilla.org', 'The reference for everything web platform.'],
            ['Canopy Design System', 'canopy://home', 'Original icons, colors and layout tokens used across the system.'],
            ['Hacker News', 'https://news.ycombinator.com', 'Technology news and discussion.'],
            ['Green Noise — Moss & Pine', 'canopy://home', 'Ambient album recorded in a cabin with one microphone.'],
          ].map(([title, url, desc]) => `<a class="bp-result" data-nav="${escapeHtml(url)}"><div class="bp-result-url">${escapeHtml(url.replace('canopy://', 'canopy://'))}</div><div class="bp-result-title">${escapeHtml(title)}</div><div class="bp-result-desc">${escapeHtml(desc)}</div></a>`).join('')}
        </div>`,
      };
    }

    function bookmarksView() {
      const bookmarks = data.get('bookmarks', []);
      return {
        kind: 'page', title: 'Bookmarks',
        html: `<div class="bp-file"><h1>Bookmarks</h1>
          ${bookmarks.map((b) => `<div class="bp-bookmark"><span>${glyph('globe', 15, 1.8)}</span><a data-nav="${escapeHtml(b.url)}">${escapeHtml(b.title)}</a><small class="muted">${escapeHtml(b.url)}</small><button class="icon-btn" data-rmbm="${b.id}">${glyph('trash', 12, 1.9)}</button></div>`).join('') || '<p class="muted">No bookmarks yet. Press ⌘D to add the current page.</p>'}
        </div>`,
      };
    }

    function historyView() {
      return {
        kind: 'page', title: 'History',
        html: `<div class="bp-file"><h1>History</h1>
          ${history.map((h) => `<div class="bp-history"><a data-nav="${escapeHtml(h.url)}">${escapeHtml(h.url)}</a><small class="muted">${relTime(h.ts)}</small></div>`).join('') || '<p class="muted">Nothing visited yet.</p>'}
          <div style="margin-top:14px"><button class="btn small danger" data-clearhistory>Clear History</button></div>
        </div>`,
      };
    }

    function aboutView() {
      return {
        kind: 'page', title: 'About Canopy Browser',
        html: `<div class="bp-file"><h1>Canopy Browser</h1>
          <p>Canopy Browser is a local-first browser shell. It renders its own start pages, bookmarks and history, and sandboxes external sites in an iframe.</p>
          <h3>Privacy</h3><p class="muted">No telemetry. History and bookmarks live in your browser's local storage. Clear site data to remove them.</p>
          <h3>Shortcuts</h3><p class="muted">⌘T new tab · ⌘W close tab · ⌘D bookmark · ⌘R reload</p>
          <h3>Engines</h3><p class="muted">This is not Chromium. External pages use the host browser's engine — CanopyOS merely embeds them.</p>
        </div>`,
      };
    }

    function bindPage(view) {
      viewEl.querySelectorAll('[data-nav]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.nav); }));
      viewEl.querySelectorAll('[data-open]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); navigate(normalize(`file://${a.dataset.open}`)); }));
      viewEl.querySelector('[data-search-form]')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = viewEl.querySelector('[data-q]').value;
        navigate(`canopy://search?q=${encodeURIComponent(q)}`);
      });
      viewEl.querySelectorAll('[data-rmbm]').forEach((b) => b.addEventListener('click', () => {
        data.set('bookmarks', data.get('bookmarks', []).filter((x) => x.id !== b.dataset.rmbm));
        navigate('canopy://bookmarks');
      }));
      viewEl.querySelector('[data-clearhistory]')?.addEventListener('click', () => {
        history = [];
        data.set('browserHistory', []);
        navigate('canopy://history');
      });
    }

    win._newTab = () => { newTab(); renderTabs(); load(); };
    win._closeTab = () => {
      if (tabs.length === 1) { win.close(); return; }
      tabs.splice(active, 1);
      active = Math.max(0, active - 1);
      load();
    };
    win._go = (url) => navigate(url);
    win._reload = () => load();
    win._bookmark = () => {
      const t = tab();
      if (!t) return;
      const bookmarks = data.get('bookmarks', []);
      if (bookmarks.some((b) => b.url === t.url)) {
        data.set('bookmarks', bookmarks.filter((b) => b.url !== t.url));
        statusEl.textContent = 'Bookmark removed';
      } else {
        data.set('bookmarks', [...bookmarks, { id: uid('b'), title: t.title, url: t.url }]);
        statusEl.textContent = 'Bookmark added';
      }
      sound.play('pop');
      load();
    };

    newTab(args?.url ? normalize(args.url) : 'canopy://home', false);
    load();
  },
};
