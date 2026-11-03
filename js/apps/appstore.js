/* CanopyOS — App Store */
import { allApps, wm, getApp } from '../core/wm.js';
import { store } from '../core/store.js';
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph, appIcon } from '../core/icons.js';
import { escapeHtml } from '../core/util.js';
import { notify } from '../core/notify.js';
import { alertModal } from '../ui/modal.js';

const CATEGORIES = [
  { id: 'discover', label: 'Discover', icon: 'sparkle' },
  { id: 'create', label: 'Create', icon: 'paint' },
  { id: 'work', label: 'Work', icon: 'code' },
  { id: 'play', label: 'Play', icon: 'games' },
  { id: 'updates', label: 'Updates', icon: 'download' },
];

const SIZES = ['2.4 MB', '8.1 MB', '14.6 MB', '32.0 MB', '1.2 MB', '64.8 MB'];
const BLURBS = {
  finder: 'Every file, one window. Tags, gallery view and drag-and-drop.',
  terminal: 'A real shell for people who like typing. 30+ commands.',
  notes: 'Fast notes with folders, tags and markdown preview.',
  textedit: 'Plain text and markdown with live preview and autosave.',
  preview: 'Read documents, markdown and screenshots without leaving the OS.',
  calculator: 'Basic and scientific math with a memory tape.',
  settings: 'Every preference in CanopyOS, searchable.',
  calendar: 'Month view, events, reminders and upcoming agendas.',
  mail: 'Inbox, drafts and compose — simulated mail that feels real.',
  messages: 'Conversations with simulated replies.',
  contacts: 'A tidy address book with groups and favorites.',
  reminders: 'Lists, due dates and progress rings.',
  photos: 'Generative artwork gallery with filters and slideshow.',
  music: 'Synthesized ambient albums and a live spectrum visualizer.',
  weather: 'Hourly and seven-day forecasts for ten cities.',
  clock: 'World clocks, alarms, stopwatch and timers.',
  maps: 'Pan, zoom and drop pins on a vector city.',
  stocks: 'Watchlist, sparklines and market news.',
  dictionary: 'Definitions, synonyms and pronunciation.',
  activity: 'Live CPU, memory and process monitoring.',
  screenshot: 'Capture the desktop and save it to Pictures.',
  paint: 'Draw with a brush, marker or shapes and save as PNG.',
  code: 'Syntax highlighting plus a live HTML preview.',
  browser: 'Tabs, bookmarks and local-first start pages.',
  voice: 'Record memos with the microphone, or simulate one.',
  appstore: 'Find and install built-in CanopyOS apps.',
  minesweeper: 'The classic logic puzzle, now in the canopy.',
  game2048: 'Slide, merge and chase the 2048 tile.',
  snake: 'Eat leaves, grow your snake, don\'t hit the walls.',
  memory: 'Match pairs in a calm card game.',
};

export default {
  id: 'appstore',
  name: 'App Store',
  icon: 'appstore',
  colors: ['#3d9bff', '#0a5cd6'],
  width: 920, height: 640,
  keywords: ['store', 'install', 'download', 'apps', 'marketplace'],
  menus: (win) => [
    { label: 'Store', items: [
      { label: 'Updates', action: () => win?._cat('updates') },
      { label: 'Installed Apps', action: () => win?._installed() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let cat = 'discover';
    let query = '';
    let installing = {};
    const installed = () => store.get('dockPinned', []).filter((id) => getApp(id));
    const sizes = {};
    allApps().forEach((a, i) => { sizes[a.id] = SIZES[i % SIZES.length]; });

    root.innerHTML = `<div class="store">
      <aside class="store-side">
        <div class="store-brand">${appIcon('appstore', ['#3d9bff', '#0a5cd6'])}<div><b>App Store</b><small class="tiny muted">CanopyOS</small></div></div>
        <div class="store-nav" data-nav></div>
        <div class="store-side-foot tiny muted">${allApps().length} apps available<br>All built in, no downloads</div>
      </aside>
      <section class="store-main scroll-thin">
        <div class="store-hero" data-hero></div>
        <div class="store-section-head"><h2 data-heading></h2><span class="spacer"></span><span class="tiny muted" data-sub></span></div>
        <div class="store-grid" data-grid></div>
      </section>
    </div>`;

    const navEl = root.querySelector('[data-nav]');
    const gridEl = root.querySelector('[data-grid]');
    const heroEl = root.querySelector('[data-hero]');

    function renderNav() {
      navEl.innerHTML = CATEGORIES.map((c) => `<button class="store-nav-item ${cat === c.id ? 'active' : ''}" data-cat="${c.id}">${glyph(c.icon, 15, 1.8)}${c.label}</button>`).join('');
      navEl.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; render(); }));
    }

    function listFor() {
      let list = allApps();
      if (cat === 'create') list = list.filter((a) => ['paint', 'photos', 'music', 'code', 'textedit', 'voice', 'screenshot'].includes(a.id));
      if (cat === 'work') list = list.filter((a) => ['notes', 'mail', 'calendar', 'reminders', 'contacts', 'textedit', 'terminal', 'activity', 'settings'].includes(a.id));
      if (cat === 'play') list = list.filter((a) => ['music', 'photos', 'minesweeper', 'game2048', 'snake', 'memory', 'maps'].includes(a.id));
      if (cat === 'updates') list = list.filter((a) => ['terminal', 'notes', 'calendar', 'photos', 'music'].includes(a.id));
      if (query) {
        const q = query.toLowerCase();
        list = allApps().filter((a) => a.name.toLowerCase().includes(q) || (BLURBS[a.id] || '').toLowerCase().includes(q));
      }
      return list;
    }

    function render() {
      renderNav();
      const list = listFor();
      const isInstalled = (id) => installed().includes(id);
      const heading = query ? `Results for “${query}”` : cat === 'updates' ? 'Available Updates' : cat === 'discover' ? 'Apps for you' : CATEGORIES.find((c) => c.id === cat)?.label;
      root.querySelector('[data-heading]').textContent = heading;
      root.querySelector('[data-sub]').textContent = `${list.length} app${list.length === 1 ? '' : 's'}`;

      const featured = allApps().find((a) => a.id === 'code') || allApps()[0];
      heroEl.innerHTML = `<div class="store-hero-card">
        <div class="store-hero-art">${appIcon(featured.icon, featured.colors)}</div>
        <div class="store-hero-text"><div class="tiny" style="opacity:.8;letter-spacing:.08em">FEATURED</div>
          <h2>${escapeHtml(featured.name)}</h2>
          <p>${escapeHtml(BLURBS[featured.id] || 'A great app for CanopyOS.')}</p>
          <button class="btn small" data-hero-open>${isInstalled(featured.id) ? 'Open' : 'Get'}</button>
        </div>
      </div>`;
      heroEl.querySelector('[data-hero-open]').addEventListener('click', () => openApp(featured.id));

      gridEl.innerHTML = list.map((a) => `<div class="store-card">
        <div class="store-card-top">${appIcon(a.icon, a.colors, a.iconOpts)}<div class="store-card-meta"><b>${escapeHtml(a.name)}</b><small>${escapeHtml(BLURBS[a.id] || 'CanopyOS built-in app')}</small>
          <div class="store-rating">${'★★★★★'.slice(0, 4)}<span class="muted">★</span> <span class="tiny muted">4.${(a.name.length % 9) + 1} · ${sizes[a.id]}</span></div></div></div>
        <div class="store-card-foot">
          <span class="tiny muted">${isInstalled(a.id) ? 'Installed' : 'Free'}</span>
          <span class="spacer"></span>
          <button class="store-get ${isInstalled(a.id) ? 'open' : ''}" data-get="${a.id}">${installing[a.id] ? Math.round(installing[a.id]) + '%' : isInstalled(a.id) ? 'Open' : 'Get'}</button>
        </div>
      </div>`).join('') || `<div class="empty-state" style="grid-column:1/-1">${glyph('search', 36)}<div>No apps found</div></div>`;

      gridEl.querySelectorAll('[data-get]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.get;
        if (isInstalled(id)) { wm.open(id); return; }
        install(id, b);
      }));
    }

    function install(id, btn) {
      const app = getApp(id);
      if (!app) return;
      installing[id] = 0;
      btn.classList.add('installing');
      sound.play('pop');
      const timer = setInterval(() => {
        installing[id] = Math.min(100, installing[id] + 6 + Math.random() * 14);
        btn.textContent = `${Math.round(installing[id])}%`;
        if (installing[id] >= 100) {
          clearInterval(timer);
          delete installing[id];
          const pinned = store.get('dockPinned', []);
          if (!pinned.includes(id)) store.set('dockPinned', [...pinned, id]);
          const list = data.get('installedApps', []);
          if (!list.includes(id)) data.set('installedApps', [...list, id]);
          sound.play('success');
          notify.post({ title: 'App installed', body: `${app.name} was added to your Dock.`, app: 'App Store', appId: 'appstore', icon: 'appstore', colors: ['#3d9bff', '#0a5cd6'] });
          render();
        }
      }, 160);
    }

    function openApp(id) {
      const pinned = store.get('dockPinned', []);
      if (!pinned.includes(id)) store.set('dockPinned', [...pinned, id]);
      wm.open(id);
    }
    win._cat = (c) => { cat = c; render(); };
    win._installed = () => alertModal({ title: 'Installed Apps', art: 'grid', body: installed().map((id) => `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${escapeHtml(getApp(id).name)}</span><span class="tiny muted">Installed</span></div>`).join('') || 'No apps installed yet.' });

    toolbar.innerHTML = `<span class="fn-toolbar-title">App Store</span><span class="spacer"></span>
      <label class="fn-search no-drag">${glyph('search', 12, 2)}<input type="search" placeholder="Search apps" data-q aria-label="Search apps" /></label>`;
    toolbar.querySelector('[data-q]').addEventListener('input', (e) => { query = e.target.value; render(); });

    render();
  },
};
