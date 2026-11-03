/* CanopyOS — Maps: pan/zoom vector map, search, directions */
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, seededRandom } from '../core/util.js';

const PLACES = [
  { id: 'p1', name: 'Canopy HQ', kind: 'Work', x: 46, y: 40, icon: 'home', detail: '128 Understory Way · Open until 7 PM' },
  { id: 'p2', name: 'Fern & Filter', kind: 'Coffee', x: 38, y: 52, icon: 'home', detail: 'Oat cortado, extra hot · 4.8 ★' },
  { id: 'p3', name: 'Balboa Park', kind: 'Park', x: 58, y: 34, icon: 'leaf', detail: '1,200 acres · Gardens open at 8 AM' },
  { id: 'p4', name: 'Torrey Pines', kind: 'Trail', x: 30, y: 18, icon: 'mountain', detail: 'Coastal bluff trail · 3.4 km loop' },
  { id: 'p5', name: 'Ocean Beach Pier', kind: 'Beach', x: 22, y: 62, icon: 'wave', detail: 'Sunset at 6:42 PM · Surf 3–4 ft' },
  { id: 'p6', name: 'Mission Trails', kind: 'Trail', x: 68, y: 58, icon: 'mountain', detail: 'Cowles Mountain trailhead · 5.1 km' },
  { id: 'p7', name: 'Central Library', kind: 'Library', x: 52, y: 48, icon: 'book', detail: 'Open until 8 PM · 9 floors' },
  { id: 'p8', name: 'Hillcrest Market', kind: 'Grocery', x: 44, y: 56, icon: 'tag', detail: 'Farmers market Sundays 9–2' },
  { id: 'p9', name: 'Point Loma', kind: 'Viewpoint', x: 26, y: 74, icon: 'compass', detail: 'Tide pools and harbor views' },
  { id: 'p10', name: 'Coronado Beach', kind: 'Beach', x: 34, y: 88, icon: 'wave', detail: 'Golden sand, gentle surf' },
  { id: 'p11', name: 'Julian Orchards', kind: 'Country', x: 82, y: 22, icon: 'plant', detail: 'Apple pie and mountain air' },
  { id: 'p12', name: 'CanopyOS Studio', kind: 'Work', x: 60, y: 28, icon: 'code', detail: 'Quiet desks · Open 24 hours' },
];

const STYLES = {
  standard: { bg: 'linear-gradient(160deg,#e8eef2,#dbe6ea 40%,#cfe0e6)', land: '#f2f6f1', water: '#bcdff0', road: '#ffffff', label: '#4b5b63' },
  night: { bg: 'linear-gradient(160deg,#101a24,#0b1218)', land: '#16232c', water: '#0d1c26', road: '#2a3f4c', label: '#9fb4c0' },
  terrain: { bg: 'linear-gradient(160deg,#e9e3cf,#dfe5cd 40%,#cfe0d3)', land: '#eef0d8', water: '#a9cfe0', road: '#f7f4e8', label: '#4c5a45' },
};

export default {
  id: 'maps',
  name: 'Maps',
  icon: 'maps',
  colors: ['#8fd3a8', '#2f8f6b'],
  width: 940, height: 640,
  keywords: ['map', 'directions', 'location', 'navigation', 'places'],
  menus: (win) => [
    { label: 'View', items: [
      { label: 'Zoom In', shortcut: '⌘+', action: () => win?._zoom(0.2) },
      { label: 'Zoom Out', shortcut: '⌘-', action: () => win?._zoom(-0.2) },
      { label: 'Center on Me', action: () => win?._center() },
      { sep: true },
      { label: 'Standard', action: () => window.dispatchEvent(new CustomEvent('canopy:map-style', { detail: 'standard' })) },
      { label: 'Night', action: () => window.dispatchEvent(new CustomEvent('canopy:map-style', { detail: 'night' })) },
      { label: 'Terrain', action: () => window.dispatchEvent(new CustomEvent('canopy:map-style', { detail: 'terrain' })) },
    ] },
  ],

  mount({ root, win }) {
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let style = 'standard';
    let query = '';
    let activeId = null;
    let pinMode = false;
    let pins = [];

    root.innerHTML = `<div class="maps">
      <div class="maps-canvas" data-canvas>
        <div class="maps-layer" data-layer></div>
        <div class="maps-topbar">
          <label class="maps-search">${glyph('search', 14, 2)}<input type="search" placeholder="Search Maps" data-search aria-label="Search places" /></label>
          <div class="maps-results" data-results hidden></div>
        </div>
        <div class="maps-controls">
          <button data-zoom="1" title="Zoom in">＋</button>
          <button data-zoom="-1" title="Zoom out">−</button>
          <button data-center title="Center">${glyph('pin', 14, 1.9)}</button>
          <button data-pin title="Drop pin">${glyph('plus', 14, 2.2)}</button>
        </div>
        <div class="maps-style">
          ${Object.keys(STYLES).map((s) => `<button data-style="${s}" class="${s === style ? 'on' : ''}">${s}</button>`).join('')}
        </div>
        <div class="maps-scale">200 m</div>
        <div class="maps-attrib tiny">Canopy Maps · vector demo · all roads fictional</div>
      </div>
      <aside class="maps-card" data-card hidden></aside>
    </div>`;

    const canvas = root.querySelector('[data-canvas]');
    const layer = root.querySelector('[data-layer]');
    const card = root.querySelector('[data-card]');
    const results = root.querySelector('[data-results]');

    function mapBackground() {
      const s = STYLES[style];
      const rnd = seededRandom('map' + style);
      const roads = Array.from({ length: 18 }, (_, i) => {
        const pos = 5 + rnd() * 90;
        const horiz = rnd() > 0.5;
        return horiz
          ? `<div style="position:absolute;left:0;right:0;top:${pos}%;height:${rnd() > 0.7 ? 3 : 1.6}px;background:${s.road};opacity:${0.5 + rnd() * 0.4}"></div>`
          : `<div style="position:absolute;top:0;bottom:0;left:${pos}%;width:${rnd() > 0.7 ? 3 : 1.6}px;background:${s.road};opacity:${0.5 + rnd() * 0.4}"></div>`;
      }).join('');
      return `<div class="maps-bg" style="background:${s.bg}">
        <div class="maps-water" style="background:${s.water}"></div>
        <div class="maps-land" style="background:${s.land}"></div>
        ${roads}
        <div class="maps-park" style="background:${style === 'night' ? '#1c3326' : '#d7ecc9'}"></div>
        <div class="maps-labels" style="color:${s.label}">
          <span style="left:52%;top:38%">Balboa Park</span>
          <span style="left:20%;top:66%">Ocean Beach</span>
          <span style="left:62%;top:56%">Mission Trails</span>
          <span style="left:32%;top:12%">Torrey Pines</span>
          <span class="maps-label-water" style="left:8%;top:46%">Pacific Ocean</span>
        </div>
      </div>`;
    }

    function renderMarkers() {
      const all = [...PLACES, ...pins];
      const visible = query ? all.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.kind.toLowerCase().includes(query.toLowerCase())) : all;
      const markers = visible.map((p) => `<button class="maps-pin ${p.id === activeId ? 'active' : ''}" data-pin-id="${p.id}" style="left:${p.x}%;top:${p.y}%">
        <span class="maps-pin-dot" style="background:${p.id === activeId ? '#0a84ff' : '#ef476f'}">${glyph(p.icon || 'pin', 11, 2.2)}</span>
        <span class="maps-pin-label">${escapeHtml(p.name)}</span>
      </button>`).join('');
      const me = `<div class="maps-me" style="left:44%;top:46%"><span></span></div>`;
      const route = activeId ? `<svg class="maps-route" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M44,46 Q${(44 + (all.find((p) => p.id === activeId)?.x || 50)) / 2},${40} ${all.find((p) => p.id === activeId)?.x || 50},${all.find((p) => p.id === activeId)?.y || 50}" fill="none" stroke="#0a84ff" stroke-width="1.4" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/></svg>` : '';
      layer.innerHTML = `${mapBackground()}${route}${markers}${me}`;
      layer.querySelectorAll('[data-pin-id]').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        activeId = b.dataset.pinId;
        renderMarkers();
        renderCard();
        sound.play('click');
      }));
    }

    function renderCard() {
      const p = [...PLACES, ...pins].find((x) => x.id === activeId);
      if (!p) { card.hidden = true; return; }
      card.hidden = false;
      const rnd = seededRandom(p.name);
      const km = (1.2 + rnd() * 8).toFixed(1);
      const mins = Math.round(km * 4.5 + 4);
      card.innerHTML = `<div class="maps-card-head" style="background:linear-gradient(135deg,${style === 'night' ? '#1b2b36,#0e1a22' : '#dff1e2,#bfe3cf'})">
          <div class="maps-card-pin">${glyph(p.icon || 'pin', 26, 1.6)}</div>
          <button class="icon-btn" data-close>${glyph('close', 13, 2.2)}</button>
        </div>
        <div class="maps-card-body">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="tiny muted">${escapeHtml(p.kind)} · ${escapeHtml(p.detail || 'Dropped pin')}</div>
          <div class="maps-card-stats"><div><b>${km} km</b><small>distance</small></div><div><b>${mins} min</b><small>drive</small></div><div><b>${Math.round(km * 13)} min</b><small>walk</small></div></div>
          <div class="hstack" style="margin-top:12px">
            <button class="btn small primary" data-go>${glyph('plane', 11, 2)} Directions</button>
            <button class="btn small" data-share>${glyph('share', 11, 2)} Share</button>
            <span class="spacer"></span>
            <button class="btn small ghost" data-remove>${glyph('trash', 12, 1.9)}</button>
          </div>
        </div>`;
      card.querySelector('[data-close]').addEventListener('click', () => { activeId = null; card.hidden = true; renderMarkers(); });
      card.querySelector('[data-go]').addEventListener('click', () => {
        card.querySelector('[data-go]').textContent = 'Route ready';
        import('../core/notify.js').then(({ notify }) => notify.post({
          title: 'Directions', body: `${km} km · ${mins} min by car to ${p.name}`, icon: 'maps', colors: ['#8fd3a8', '#2f8f6b'], app: 'Maps', appId: 'maps',
        }));
      });
      card.querySelector('[data-share]').addEventListener('click', () => {
        import('../core/util.js').then(({ copyText }) => copyText(`https://maps.canopy.local/place/${encodeURIComponent(p.name)}`));
      });
      card.querySelector('[data-remove]').addEventListener('click', () => {
        if (pins.some((x) => x.id === p.id)) {
          pins = pins.filter((x) => x.id !== p.id);
          activeId = null;
          card.hidden = true;
          renderMarkers();
        }
      });
    }

    function applyTransform() {
      layer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      layer.style.transformOrigin = 'center center';
      root.querySelector('.maps-scale').textContent = `${Math.round(200 / scale)} m`;
    }

    win._zoom = (delta) => { scale = Math.max(0.6, Math.min(4, scale + delta)); applyTransform(); };
    win._center = () => { tx = 0; ty = 0; scale = 1; applyTransform(); };

    canvas.querySelector('[data-zoom="1"]').addEventListener('click', () => win._zoom(0.25));
    canvas.querySelector('[data-zoom="-1"]').addEventListener('click', () => win._zoom(-0.25));
    canvas.querySelector('[data-center]').addEventListener('click', () => win._center());
    canvas.querySelector('[data-pin]').addEventListener('click', () => {
      pinMode = !pinMode;
      canvas.classList.toggle('pinning', pinMode);
    });
    canvas.querySelectorAll('[data-style]').forEach((b) => b.addEventListener('click', () => {
      style = b.dataset.style;
      canvas.querySelectorAll('[data-style]').forEach((x) => x.classList.toggle('on', x === b));
      renderMarkers();
    }));
    window.addEventListener('canopy:map-style', (e) => {
      style = e.detail;
      renderMarkers();
    });

    // pan
    let dragging = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.maps-topbar, .maps-controls, .maps-style, .maps-pin')) return;
      dragging = { x: e.clientX, y: e.clientY, tx, ty };
      canvas.classList.add('grabbing');
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      tx = dragging.tx + (e.clientX - dragging.x);
      ty = dragging.ty + (e.clientY - dragging.y);
      applyTransform();
    });
    window.addEventListener('pointerup', () => { dragging = null; canvas.classList.remove('grabbing'); });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      win._zoom(e.deltaY > 0 ? -0.12 : 0.12);
    }, { passive: false });
    canvas.addEventListener('click', (e) => {
      if (!pinMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const pin = { id: 'pin' + Date.now(), name: 'Dropped Pin', kind: 'Pin', x, y, icon: 'pin', detail: 'A pin you placed on the map' };
      pins.push(pin);
      activeId = pin.id;
      pinMode = false;
      canvas.classList.remove('pinning');
      renderMarkers();
      renderCard();
    });

    // search
    root.querySelector('[data-search]').addEventListener('input', (e) => {
      query = e.target.value;
      renderMarkers();
      const matches = [...PLACES, ...pins].filter((p) => query && (p.name.toLowerCase().includes(query.toLowerCase()) || p.kind.toLowerCase().includes(query.toLowerCase())));
      results.hidden = !query;
      results.innerHTML = matches.map((p) => `<button class="maps-result" data-go="${p.id}">${glyph(p.icon || 'pin', 14, 1.9)}<span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.kind)} · ${escapeHtml(p.detail || '')}</small></span></button>`).join('') || '<div class="tiny muted" style="padding:12px">No places found</div>';
      results.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
        activeId = b.dataset.go;
        results.hidden = true;
        renderMarkers();
        renderCard();
      }));
    });

    toolbar.innerHTML = `<span class="fn-toolbar-title">Canopy Maps</span><span class="spacer"></span>
      <span class="tiny muted no-drag">San Diego, CA</span>`;
    renderMarkers();
    applyTransform();
    win.onClose(() => { dragging = null; });
  },
};
