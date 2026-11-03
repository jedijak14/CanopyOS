/* CanopyOS — Photos: generated CSS artwork gallery with a lightbox editor */
import { data } from '../core/data.js';
import { fs, HOME } from '../core/fs.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, seededRandom, download } from '../core/util.js';
import { notify } from '../core/notify.js';
import { confirmModal } from '../ui/modal.js';

/** Deterministic abstract artwork made of layered gradients and shapes. */
export function photoArt(photo, { filter = '' } = {}) {
  const [a, b] = photo.colors;
  const rnd = seededRandom(photo.id + photo.title);
  const blobs = Array.from({ length: 4 }, () => {
    const x = 10 + rnd() * 80;
    const y = 10 + rnd() * 80;
    const size = 20 + rnd() * 55;
    return `<div style="position:absolute;left:${x}%;top:${y}%;width:${size}%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), rgba(255,255,255,0) 70%);filter:blur(2px);transform:translate(-50%,-50%)"></div>`;
  }).join('');
  const rays = Array.from({ length: 7 }, (_, i) => `<div style="position:absolute;left:50%;top:120%;width:${3 + rnd() * 6}%;height:160%;background:linear-gradient(to top, rgba(255,255,255,.16), rgba(255,255,255,0));transform:translateX(-50%) rotate(${-40 + i * 13}deg);transform-origin:top center"></div>`).join('');
  return `<div class="photo-art" style="background:linear-gradient(${120 + rnd() * 100}deg, ${a}, ${b});filter:${filter}">
    ${rays}${blobs}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.18))"></div>
  </div>`;
}

const FILTERS = [
  ['none', 'Original', ''],
  ['warm', 'Warm', 'sepia(.28) saturate(1.15) contrast(1.02)'],
  ['cool', 'Cool', 'hue-rotate(12deg) saturate(1.05) brightness(1.02)'],
  ['mono', 'Mono', 'grayscale(1) contrast(1.08)'],
  ['vivid', 'Vivid', 'saturate(1.6) contrast(1.1)'],
  ['fade', 'Fade', 'saturate(.7) brightness(1.08) contrast(.92)'],
];

export default {
  id: 'photos',
  name: 'Photos',
  icon: 'photos',
  colors: ['#ffd166', '#ef476f'],
  width: 980, height: 660,
  keywords: ['images', 'gallery', 'pictures', 'album', 'camera'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Artwork', shortcut: '⌘N', action: () => win?._generate() },
      { label: 'Export…', action: () => win?._export() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'View', items: [
      { label: 'Show Info', shortcut: '⌘I', action: () => win?._toggleInfo() },
      { label: 'Slideshow', action: () => win?._slideshow() },
      { label: 'Favorites', action: () => win?._viewFavorites() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let photos = data.get('photos', []);
    let view = 'all';
    let query = '';
    let selectedId = null;
    let filter = 'none';
    let slideshow = null;
    let showInfo = true;

    root.innerHTML = `<div class="photos">
      <aside class="photos-side">
        <div class="photos-side-title">Library</div>
        <button class="photos-nav" data-view="all">${glyph('photos', 14, 1.8)} All Photos <span class="spacer"></span><span class="tiny muted" data-count-all></span></button>
        <button class="photos-nav" data-view="fav">${glyph('heart', 14, 1.8)} Favorites</button>
        <button class="photos-nav" data-view="recent">${glyph('clockSmall', 14, 1.8)} Recently Added</button>
        <div class="photos-side-title" style="margin-top:14px">Albums</div>
        <button class="photos-nav" data-view="portrait">${glyph('user', 14, 1.8)} Portraits</button>
        <button class="photos-nav" data-view="landscape">${glyph('mountain', 14, 1.8)} Landscapes</button>
        <div class="photos-side-foot tiny muted">${photos.length} generated artworks<br>No image files — pure CSS</div>
      </aside>
      <section class="photos-main">
        <div class="photos-top"><h2 data-title>All Photos</h2><span class="spacer"></span>
          <label class="fn-search"><span>${glyph('search', 12, 2)}</span><input type="search" placeholder="Search photos" data-search aria-label="Search photos" /></label>
          <button class="btn small" data-gen>${glyph('sparkle', 12, 2)} Generate</button>
        </div>
        <div class="photos-grid scroll-thin" data-grid></div>
      </section>
      <aside class="photos-lightbox" data-lightbox hidden></aside>
    </div>`;

    const gridEl = root.querySelector('[data-grid]');
    const lbEl = root.querySelector('[data-lightbox]');
    const titleEl = root.querySelector('[data-title]');

    const selected = () => photos.find((p) => p.id === selectedId);
    const persist = () => data.set('photos', photos);

    function filtered() {
      let list = photos;
      if (view === 'fav') list = list.filter((p) => p.favorite);
      if (view === 'recent') list = list.slice(0, 8);
      if (view === 'portrait' || view === 'landscape') list = list.filter((p) => p.kind === view);
      if (query) {
        const q = query.toLowerCase();
        list = list.filter((p) => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
      }
      return list;
    }

    function renderGrid() {
      const list = filtered();
      const titles = { all: 'All Photos', fav: 'Favorites', recent: 'Recently Added', portrait: 'Portraits', landscape: 'Landscapes' };
      titleEl.textContent = titles[view] || 'Photos';
      root.querySelector('[data-count-all]').textContent = String(photos.length);
      gridEl.innerHTML = list.length ? list.map((p) => `<button class="photo-cell ${p.id === selectedId ? 'sel' : ''}" data-id="${p.id}" title="${escapeHtml(p.title)}">
        ${photoArt(p)}
        <span class="photo-cell-tags">${p.favorite ? glyph('heart', 10, 2) : ''}${escapeHtml(p.title)}</span>
      </button>`).join('') : `<div class="empty-state" style="grid-column:1/-1">${glyph('photos', 42)}<div>No photos here</div></div>`;
      gridEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { selectedId = b.dataset.id; renderGrid(); renderLightbox(); }));
    }

    function renderLightbox() {
      const p = selected();
      if (!p) { lbEl.hidden = true; return; }
      lbEl.hidden = false;
      lbEl.innerHTML = `<div class="lb-head"><b>${escapeHtml(p.title)}</b><span class="spacer"></span>
          <button class="icon-btn" data-fav title="Favorite">${glyph('heart', 15, 1.8)}</button>
          <button class="icon-btn" data-prev title="Previous">${glyph('chevronLeft', 15, 2)}</button>
          <button class="icon-btn" data-next title="Next">${glyph('chevronRight', 15, 2)}</button>
          <button class="icon-btn" data-close title="Close">${glyph('close', 13, 2.4)}</button></div>
        <div class="lb-art">${photoArt(p, { filter: FILTERS.find((f) => f[0] === filter)?.[2] || '' })}</div>
        <div class="lb-filters">${FILTERS.map(([id, label]) => `<button class="lb-filter ${filter === id ? 'on' : ''}" data-filter="${id}">${label}</button>`).join('')}</div>
        ${showInfo ? `<div class="lb-info">
          <div class="tiny"><b>${escapeHtml(p.title)}</b></div>
          <div class="tiny muted">${escapeHtml(p.location)} · ${new Date(p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div class="tiny muted">Generated artwork · CSS gradients</div>
        </div>` : ''}
        <div class="lb-actions"><button class="btn small" data-export>Export PNG info</button><button class="btn small" data-savecopy>Save to Pictures</button><button class="btn small danger" data-del>Delete</button></div>`;
      lbEl.querySelector('[data-close]').addEventListener('click', () => { selectedId = null; renderGrid(); renderLightbox(); });
      lbEl.querySelector('[data-fav]').addEventListener('click', () => { p.favorite = !p.favorite; persist(); renderGrid(); sound.play('pop'); });
      lbEl.querySelector('[data-prev]').addEventListener('click', () => step(-1));
      lbEl.querySelector('[data-next]').addEventListener('click', () => step(1));
      lbEl.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; renderLightbox(); }));
      lbEl.querySelector('[data-export]').addEventListener('click', () => {
        download(`${p.title.replace(/\s+/g, '-').toLowerCase()}.txt`, `Photo: ${p.title}\nLocation: ${p.location}\nColors: ${p.colors.join(' → ')}\nFilter: ${filter}\n\nCanopyOS artwork is generated in CSS, so there is no raster file to export.`);
      });
      lbEl.querySelector('[data-savecopy]').addEventListener('click', () => {
        const dir = `${HOME}/Pictures`;
        let name = `${p.title}.art`;
        let i = 2;
        while (fs.exists(`${dir}/${name}`)) name = `${p.title} ${i++}.art`;
        fs.createFile(`${dir}/${name}`, JSON.stringify({ title: p.title, colors: p.colors, filter }, null, 2), { kind: 'art' });
        notify.post({ title: 'Saved to Pictures', body: `${p.title} was added to your Pictures folder.`, icon: 'image', colors: ['#7be0c0', '#2f9e7a'], app: 'Photos', appId: 'photos' });
      });
      lbEl.querySelector('[data-del]').addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete photo?', body: 'This artwork will be removed from your library.', okLabel: 'Delete' });
        if (!ok) return;
        photos = photos.filter((x) => x.id !== p.id);
        persist();
        selectedId = null;
        renderGrid();
        renderLightbox();
      });
    }

    function step(dir) {
      const list = filtered();
      const idx = list.findIndex((p) => p.id === selectedId);
      const next = list[(idx + dir + list.length) % list.length];
      if (next) { selectedId = next.id; renderGrid(); renderLightbox(); }
    }

    win._generate = () => {
      const palettes = [['#ffd166', '#ef476f'], ['#06d6a0', '#118ab2'], ['#cdb4db', '#ffafcc'], ['#a2d2ff', '#ffc8dd'], ['#f4a261', '#e76f51'], ['#90be6d', '#2a9d8f'], ['#c77dff', '#5a189a'], ['#ff9f1c', '#2ec4b6']];
      const places = ['Balboa Park', 'Torrey Pines', 'Point Loma', 'Mission Trails', 'Julian', 'Ocean Beach', 'Anza-Borrego'];
      const rnd = Math.random();
      const photo = {
        id: 'p' + Date.now(), title: ['New Light', 'Study in Green', 'Coastal Drift', 'Canopy No. 4', 'Quiet Form'][Math.floor(rnd * 5)] + ' ' + Math.floor(rnd * 90 + 10),
        colors: palettes[Math.floor(rnd * palettes.length)], location: places[Math.floor(rnd * places.length)],
        date: Date.now(), favorite: false, kind: rnd > 0.5 ? 'portrait' : 'landscape',
      };
      photos = [photo, ...photos];
      persist();
      selectedId = photo.id;
      renderGrid();
      renderLightbox();
      sound.play('success');
    };
    win._export = () => { const p = selected(); if (p) lbEl.querySelector('[data-export]')?.click(); };
    win._toggleInfo = () => { showInfo = !showInfo; renderLightbox(); };
    win._viewFavorites = () => { view = 'fav'; renderGrid(); };
    win._slideshow = () => {
      if (slideshow) { clearInterval(slideshow); slideshow = null; win.setTitle('Photos'); return; }
      const list = filtered();
      if (!list.length) return;
      if (!selectedId) selectedId = list[0].id;
      renderLightbox();
      win.setTitle('Photos — Slideshow');
      slideshow = setInterval(() => step(1), 2600);
    };

    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; renderGrid(); }));
    root.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; renderGrid(); });
    root.querySelector('[data-gen]').addEventListener('click', () => win._generate());
    document.addEventListener('keydown', (e) => {
      if (!selectedId || !root.isConnected) return;
      if (e.key === 'Escape') { selectedId = null; renderGrid(); renderLightbox(); }
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });

    renderGrid();
    renderLightbox();
    toolbar.innerHTML = `<span class="fn-toolbar-title">Photos</span><span class="spacer"></span>
      <button class="btn small no-drag" data-slides>${glyph('play', 11, 2)} Slideshow</button>
      <button class="btn small no-drag" data-tb-gen>${glyph('sparkle', 11, 2)} New Artwork</button>`;
    toolbar.querySelector('[data-tb-gen]').addEventListener('click', () => win._generate());
    toolbar.querySelector('[data-slides]').addEventListener('click', () => win._slideshow());

    win.onClose(() => { if (slideshow) clearInterval(slideshow); });
    const sub = data.subscribe('photos', (list) => { photos = list; renderGrid(); });
    win.onClose(() => sub());
  },
};
