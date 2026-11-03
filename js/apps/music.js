/* CanopyOS — Music player with generative audio + spectrum visualizer */
import { media, fmtDuration } from '../core/media.js';
import { store } from '../core/store.js';
import { sound, music } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml } from '../core/util.js';
import { notify } from '../core/notify.js';

export default {
  id: 'music',
  name: 'Music',
  icon: 'music',
  colors: ['#ff6b9d', '#c9184a'],
  width: 900, height: 620,
  keywords: ['audio', 'songs', 'player', 'playlist', 'podcast'],
  menus: (win) => [
    { label: 'Controls', items: [
      { label: 'Play / Pause', shortcut: 'Space', action: () => media.toggle() },
      { label: 'Next', shortcut: '⌘→', action: () => media.next() },
      { label: 'Previous', shortcut: '⌘←', action: () => media.prev() },
      { sep: true },
      { label: 'Shuffle', checked: media.get().shuffle, action: () => media.setShuffle() },
    ] },
    { label: 'File', items: [{ label: 'Close', shortcut: '⌘W', action: () => win?.close() }] },
  ],

  mount({ root, toolbar, win }) {
    let view = 'library';
    let query = '';
    let raf = null;
    let canvas = null;

    root.innerHTML = `<div class="music">
      <aside class="music-side">
        <div class="music-side-title">Listen Now</div>
        <button class="music-nav active" data-view="library">${glyph('music', 14, 1.8)} Library</button>
        <button class="music-nav" data-view="albums">${glyph('layers', 14, 1.8)} Albums</button>
        <button class="music-nav" data-view="artists">${glyph('user', 14, 1.8)} Artists</button>
        <div class="music-side-title" style="margin-top:14px">Playlists</div>
        <button class="music-nav" data-view="ambient">${glyph('leaf', 14, 1.8)} Forest Focus</button>
        <button class="music-nav" data-view="night">${glyph('moon', 14, 1.8)} Night Canopy</button>
        <div class="music-side-foot tiny muted">All audio is synthesized live with WebAudio.<br>No audio files.</div>
      </aside>
      <section class="music-main">
        <div class="music-head">
          <h2 data-title>Library</h2><span class="spacer"></span>
          <label class="fn-search"><span>${glyph('search', 12, 2)}</span><input type="search" placeholder="Search" data-search aria-label="Search music" /></label>
        </div>
        <div class="music-feature" data-feature></div>
        <div class="music-tracks scroll-thin" data-tracks></div>
      </section>
      <aside class="music-now">
        <canvas class="music-viz" data-viz width="240" height="120"></canvas>
        <div class="music-art" data-art></div>
        <div class="music-now-title" data-nowtitle></div>
        <div class="music-now-artist" data-nowartist></div>
        <div class="music-progress" data-progress><span data-progressbar></span></div>
        <div class="music-times"><span data-cur>0:00</span><span data-dur>0:00</span></div>
        <div class="music-controls">
          <button class="icon-btn" data-shuffle title="Shuffle">${glyph('shuffle', 15, 1.8)}</button>
          <button class="icon-btn" data-prev title="Previous">${glyph('prev', 16, 2)}</button>
          <button class="music-play" data-play aria-label="Play">${glyph('play', 18, 2.2)}</button>
          <button class="icon-btn" data-next title="Next">${glyph('next', 16, 2)}</button>
          <button class="icon-btn" data-repeat title="Repeat">${glyph('repeat', 15, 1.8)}</button>
        </div>
        <div class="music-volume">${glyph('volume', 14, 1.9)}<input type="range" min="0" max="100" value="${store.get('volume')}" data-vol aria-label="Volume"></div>
        <div class="music-queue-title">Up Next</div>
        <div class="music-queue scroll-thin" data-queue></div>
      </aside>
    </div>`;

    const tracksEl = root.querySelector('[data-tracks]');
    const titleEl = root.querySelector('[data-title]');
    const featureEl = root.querySelector('[data-feature]');
    const queueEl = root.querySelector('[data-queue]');
    canvas = root.querySelector('[data-viz]');

    const listFor = () => {
      const all = media.tracks;
      let list = all;
      if (view === 'ambient') list = all.filter((t) => ['understory', 'fern', 'oldgrowth'].includes(t.id));
      if (view === 'night') list = all.filter((t) => ['rain', 'mycelium', 'clearing'].includes(t.id));
      if (query) list = list.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()) || t.artist.toLowerCase().includes(query.toLowerCase()));
      return list;
    };

    function renderTracks() {
      const list = listFor();
      titleEl.textContent = view === 'albums' ? 'Albums' : view === 'artists' ? 'Artists' : view === 'library' ? 'Library' : view[0].toUpperCase() + view.slice(1);
      tracksEl.innerHTML = list.map((t, i) => `<button class="music-row ${media.get().track.id === t.id ? 'playing' : ''}" data-id="${t.id}">
        <span class="music-row-num">${media.get().track.id === t.id && media.get().playing ? glyph('volume', 12, 2) : i + 1}</span>
        <span class="music-row-art" style="background:linear-gradient(135deg,${t.colors[0]},${t.colors[1]})"></span>
        <span class="music-row-main"><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.artist)}</small></span>
        <span class="music-row-album muted">${escapeHtml(t.album)}</span>
        <span class="music-row-dur muted">${fmtDuration(t.duration)}</span>
      </button>`).join('');
      tracksEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
        const idx = media.tracks.findIndex((t) => t.id === b.dataset.id);
        media.play(idx);
        sound.play('click');
      }));
      featureEl.innerHTML = `<div class="music-feature-card" style="background:linear-gradient(120deg,${list[0]?.colors[0] || '#ff6b9d'},${list[0]?.colors[1] || '#c9184a'})">
        <div class="music-feature-eyebrow">FEATURED ALBUM</div>
        <div class="music-feature-title">${escapeHtml(list[0]?.album || 'Green Noise')}</div>
        <div class="music-feature-sub">${escapeHtml(list[0]?.artist || 'Canopy Ensemble')}</div>
        <button class="btn small" data-playfeat>${glyph('play', 10, 2.4)} Play</button>
      </div>`;
      featureEl.querySelector('[data-playfeat]')?.addEventListener('click', () => media.play(media.tracks.indexOf(list[0])));
    }

    function renderNow() {
      const m = media.get();
      const t = m.track;
      root.querySelector('[data-nowtitle]').textContent = t.title;
      root.querySelector('[data-nowartist]').textContent = `${t.artist} — ${t.album}`;
      root.querySelector('[data-art]').style.background = `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`;
      root.querySelector('[data-art]').innerHTML = `<span>${glyph(m.playing ? 'volume' : 'music', 30, 1.4)}</span>`;
      root.querySelector('[data-play]').innerHTML = glyph(m.playing ? 'pause' : 'play', 18, 2.2);
      root.querySelector('[data-cur]').textContent = fmtDuration(m.position);
      root.querySelector('[data-dur]').textContent = fmtDuration(t.duration);
      root.querySelector('[data-progressbar]').style.width = `${(m.position / t.duration) * 100}%`;
      root.querySelector('[data-shuffle]').classList.toggle('on', m.shuffle);
      root.querySelector('[data-shuffle]').style.color = m.shuffle ? 'var(--accent)' : '';
      root.querySelector('[data-repeat]').style.color = m.repeat !== 'off' ? 'var(--accent)' : '';
      const idx = media.tracks.indexOf(t);
      queueEl.innerHTML = media.tracks.slice(idx + 1).concat(media.tracks.slice(0, idx)).slice(0, 5).map((x) => `<button class="music-queue-row" data-q="${x.id}">
        <span class="music-row-art sm" style="background:linear-gradient(135deg,${x.colors[0]},${x.colors[1]})"></span>
        <span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.artist)}</small></span></button>`).join('');
      queueEl.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => media.play(media.tracks.findIndex((x) => x.id === b.dataset.q))));
      win.setTitle(`Music — ${t.title}`);
      tracksEl.querySelectorAll('.music-row').forEach((r) => r.classList.toggle('playing', r.dataset.id === t.id));
    }

    function draw() {
      if (!canvas || !root.isConnected) return;
      const ctx = canvas.getContext('2d');
      const data = media.spectrum();
      const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      const bars = Math.min(32, data.length);
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = (data[i] || 0) / 255;
        const bh = Math.max(2, v * h * 0.9);
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        grad.addColorStop(0, '#ff6b9d');
        grad.addColorStop(1, '#ffd166');
        ctx.fillStyle = grad;
        ctx.globalAlpha = media.get().playing ? 0.9 : 0.25;
        ctx.beginPath();
        ctx.roundRect(i * bw + bw * 0.18, h - bh, bw * 0.64, bh, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    startViz();
    function startViz() {
      cancelAnimationFrame(raf);
      const loop = () => {
        if (!root.isConnected) return;
        draw();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    root.querySelector('[data-play]').addEventListener('click', () => { media.toggle(); renderNow(); });
    root.querySelector('[data-next]').addEventListener('click', () => { media.next(); renderNow(); });
    root.querySelector('[data-prev]').addEventListener('click', () => { media.prev(); renderNow(); });
    root.querySelector('[data-shuffle]').addEventListener('click', () => { media.setShuffle(); renderNow(); });
    root.querySelector('[data-repeat]').addEventListener('click', () => {
      const order = ['off', 'all', 'one'];
      media.setRepeat(order[(order.indexOf(media.get().repeat) + 1) % 3]);
      renderNow();
    });
    root.querySelector('[data-vol]').addEventListener('input', (e) => media.setVolume(Number(e.target.value)));
    root.querySelector('[data-progress]').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      media.seek((e.clientX - r.left) / r.width);
      renderNow();
    });
    root.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; renderTracks(); });
    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.view;
      root.querySelectorAll('.music-nav').forEach((x) => x.classList.toggle('active', x === b));
      renderTracks();
    }));

    const unsub = media.subscribe(() => {
      renderNow();
    });
    document.addEventListener('keydown', onKey);
    function onKey(e) {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest('input, textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); media.toggle(); renderNow(); }
      if (e.metaKey && e.key === 'ArrowRight') media.next();
      if (e.metaKey && e.key === 'ArrowLeft') media.prev();
    }

    win.onClose(() => {
      unsub();
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    });

    toolbar.innerHTML = `<span class="fn-toolbar-title">Now Playing</span><span class="spacer"></span>
      <button class="btn small no-drag" data-tb-shuffle>${glyph('shuffle', 12, 2)} Shuffle All</button>`;
    toolbar.querySelector('[data-tb-shuffle]').addEventListener('click', () => {
      media.setShuffle(true);
      media.play(Math.floor(Math.random() * media.tracks.length));
      notify.post({ title: 'Shuffling library', body: `${media.tracks.length} tracks · generated live`, icon: 'music', colors: ['#ff6b9d', '#c9184a'], app: 'Music', appId: 'music', silent: true });
    });

    renderTracks();
    renderNow();
  },
};
