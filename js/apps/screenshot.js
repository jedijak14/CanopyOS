/* CanopyOS — Screenshot: real DOM capture via SVG foreignObject with graceful fallback */
import { fs, HOME } from '../core/fs.js';
import { wm } from '../core/wm.js';
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml } from '../core/util.js';
import { notify } from '../core/notify.js';
import { openQuickLook } from '../ui/quicklook.js';

const DIR = `${HOME}/Pictures/Screenshots`;

async function stylesheetText() {
  try {
    const [a, b] = await Promise.all([
      fetch(new URL('../../css/main.css', import.meta.url)).then((r) => r.text()),
      fetch(new URL('../../css/apps.css', import.meta.url)).then((r) => r.text()),
    ]);
    return a + '\n' + b;
  } catch (e) {
    return '';
  }
}

function fallbackCanvas() {
  const w = 1200; const h = 750;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const wp = getComputedStyle(document.getElementById('wallpaper') || document.body);
  ctx.fillStyle = '#0b3a30';
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#7ff0c3');
  grad.addColorStop(0.5, '#2b6cf6');
  grad.addColorStop(1, '#0b1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText('CanopyOS', 48, 90);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(new Date().toLocaleString(), 48, 120);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Snapshot placeholder — this browser blocked live DOM capture.', 48, 150);
  return c.toDataURL('image/jpeg', 0.85);
}

async function captureDesktop({ crop = null, maxWidth = 1400 } = {}) {
  try {
    const css = await stylesheetText();
    const wpx = window.innerWidth;
    const hpx = window.innerHeight;
    const clone = document.body.cloneNode(true);
    ['#boot', '#lockscreen', '#sleep-layer', '#shutdown-layer', '#overlays', '#toasts', '#modal-root'].forEach((sel) => clone.querySelector(sel)?.remove());
    clone.querySelectorAll('script').forEach((s) => s.remove());
    clone.querySelectorAll('.win.opening').forEach((n) => n.classList.remove('opening'));
    const rootStyle = document.documentElement.getAttribute('style') || '';
    const dataAttrs = ['theme', 'transparency', 'contrast', 'motion', 'dockMagnify', 'dockAutohide', 'dockPosition', 'widgets']
      .map((k) => `${k}="${document.documentElement.dataset[k] || ''}"`).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wpx}" height="${hpx}">
      <foreignObject x="0" y="0" width="${wpx}" height="${hpx}">
        <div xmlns="http://www.w3.org/1999/xhtml" ${dataAttrs} style="width:${wpx}px;height:${hpx}px;overflow:hidden;position:relative;${rootStyle.replace(/"/g, "'")}">
          <style>${css}
            html,body{width:${wpx}px;height:${hpx}px;overflow:hidden;margin:0}
            #wallpaper,#wallpaper-tint,#desktop,#menubar,#dock-shell{position:absolute !important}
            .win{position:absolute !important}
            .dock-item:hover .dock-label{opacity:1}
          </style>
          ${clone.innerHTML}
        </div>
      </foreignObject></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('capture blocked'));
      setTimeout(() => reject(new Error('capture timeout')), 6000);
    });
    img.src = url;
    await loaded;
    const scale = Math.min(1, maxWidth / wpx);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((crop?.w || wpx) * scale);
    canvas.height = Math.round((crop?.h || hpx) * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, crop ? crop.x : 0, crop ? crop.y : 0, crop?.w || wpx, crop?.h || hpx, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (dataUrl.length < 2000) throw new Error('empty capture');
    return dataUrl;
  } catch (e) {
    console.warn('[CanopyOS] live capture unavailable:', e.message);
    return fallbackCanvas();
  }
}

export default {
  id: 'screenshot',
  name: 'Screenshot',
  icon: 'screenshot',
  colors: ['#5b6472', '#1c2129'],
  width: 820, height: 600,
  keywords: ['capture', 'screen', 'snip', 'grab'],
  menus: (win) => [
    { label: 'Capture', items: [
      { label: 'Full Screen', shortcut: '⇧⌘3', action: () => win?._capture('full') },
      { label: 'Selected Area', shortcut: '⇧⌘4', action: () => win?._capture('area') },
      { label: 'Window', action: () => win?._capture('window') },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let mode = 'full';
    let delay = 3;
    let last = null;
    let gallery = [];

    root.innerHTML = `<div class="shot">
      <section class="shot-main">
        <div class="shot-hero" data-hero>
          <div class="shot-icon">${glyph('screenshot', 54, 1.3)}</div>
          <h2>Capture your screen</h2>
          <p class="muted tiny">Screenshots are rendered from the live DOM and saved to Pictures.</p>
          <div class="shot-modes" data-modes>
            <button data-mode="full" class="on">${glyph('screenshot', 16, 1.8)}<span>Full Screen</span></button>
            <button data-mode="area">${glyph('corner', 16, 1.8)}<span>Selected Area</span></button>
            <button data-mode="window">${glyph('layers', 16, 1.8)}<span>Window</span></button>
          </div>
          <div class="shot-delay">
            <span class="tiny muted">Delay</span>
            ${[0, 3, 5, 10].map((d) => `<button class="cc-chip ${d === delay ? 'on' : ''}" data-delay="${d}">${d ? d + 's' : 'None'}</button>`).join('')}
            <span class="spacer"></span>
            <button class="btn primary" data-capture>${glyph('camera', 13, 1.9)} Capture</button>
          </div>
        </div>
        <div class="shot-preview" data-preview hidden></div>
      </section>
      <aside class="shot-gallery">
        <div class="shot-gallery-head"><b>Gallery</b><span class="tiny muted" data-count></span></div>
        <div class="shot-gallery-grid scroll-thin" data-grid></div>
      </aside>
    </div>`;

    const grid = root.querySelector('[data-grid]');
    const preview = root.querySelector('[data-preview]');
    const hero = root.querySelector('[data-hero]');

    function loaded() {
      const dir = fs.stat(DIR);
      if (!dir) fs.mkdir(DIR);
      gallery = fs.list(DIR).filter((i) => i.node.meta?.dataUrl).reverse();
      root.querySelector('[data-count]').textContent = `${gallery.length} item${gallery.length === 1 ? '' : 's'}`;
      grid.innerHTML = gallery.length ? gallery.map((g) => `<button class="shot-thumb" data-path="${g.path}">
        <img src="${g.node.meta.dataUrl}" alt="${escapeHtml(g.name)}" />
        <span>${escapeHtml(g.name.replace(/\.jpg$/, ''))}</span>
      </button>`).join('') : `<div class="tiny muted" style="padding:14px">No screenshots yet</div>`;
      grid.querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
        const node = fs.stat(b.dataset.path);
        if (node) showPreview(node.meta.dataUrl, node.name, b.dataset.path);
      }));
    }

    function showPreview(dataUrl, name, path) {
      last = { dataUrl, name, path };
      hero.hidden = true;
      preview.hidden = false;
      preview.innerHTML = `<div class="shot-preview-head">
          <b>${escapeHtml(name)}</b><span class="spacer"></span>
          <button class="btn small" data-save>Save</button>
          <button class="btn small" data-copy>Copy</button>
          <button class="btn small" data-open>Open</button>
          <button class="btn small danger" data-del>Delete</button>
          <button class="icon-btn" data-back title="Back">${glyph('close', 13, 2.2)}</button>
        </div>
        <div class="shot-preview-img"><img src="${dataUrl}" alt="Screenshot preview" /></div>`;
      preview.querySelector('[data-back]').addEventListener('click', () => { preview.hidden = true; hero.hidden = false; });
      preview.querySelector('[data-save]').addEventListener('click', () => saveToPictures(dataUrl));
      preview.querySelector('[data-copy]').addEventListener('click', async () => {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          notify.post({ title: 'Copied to clipboard', body: 'Your screenshot is ready to paste.', icon: 'screenshot', colors: ['#5b6472', '#1c2129'] });
        } catch (e) {
          notify.post({ title: 'Copy unavailable', body: 'Your browser blocked clipboard image access. Save the file instead.', icon: 'warning' });
        }
      });
      preview.querySelector('[data-open]').addEventListener('click', () => {
        const dir = fs.stat(DIR);
        if (path && dir) openQuickLook(path);
        else if (path) openQuickLook(path);
      });
      preview.querySelector('[data-del]').addEventListener('click', () => {
        if (path) { fs.remove(path, { trash: true }); loaded(); }
        preview.hidden = true; hero.hidden = false;
      });
    }

    function saveToPictures(dataUrl) {
      const dir = fs.stat(DIR) ? DIR : (fs.mkdir(DIR), DIR);
      const stamp = new Date();
      const name = `Screenshot ${stamp.toISOString().slice(0, 10)} at ${String(stamp.getHours()).padStart(2, '0')}.${String(stamp.getMinutes()).padStart(2, '0')}.${String(stamp.getSeconds()).padStart(2, '0')}.jpg`;
      let candidate = name;
      let i = 2;
      while (fs.exists(`${DIR}/${candidate}`)) candidate = name.replace('.jpg', ` ${i++}.jpg`);
      fs.createFile(`${DIR}/${candidate}`, 'Screenshot captured in CanopyOS', { dataUrl, kind: 'screenshot' });
      notify.post({ title: 'Screenshot saved', body: candidate, icon: 'screenshot', colors: ['#5b6472', '#1c2129'], app: 'Screenshot', appId: 'screenshot' });
      sound.play('success');
      loaded();
      return `${DIR}/${candidate}`;
    }

    function countdown(seconds) {
      return new Promise((resolve) => {
        if (!seconds) return resolve();
        const overlay = document.createElement('div');
        overlay.className = 'shot-countdown';
        document.body.appendChild(overlay);
        let n = seconds;
        overlay.innerHTML = `<div class="shot-count-num">${n}</div><div class="tiny">Capturing in…</div>`;
        const timer = setInterval(() => {
          n -= 1;
          sound.play('click');
          if (n <= 0) {
            clearInterval(timer);
            overlay.remove();
            resolve();
          } else overlay.querySelector('.shot-count-num').textContent = n;
        }, 1000);
      });
    }

    function selectArea() {
      return new Promise((resolve) => {
        const layer = document.createElement('div');
        layer.className = 'shot-select';
        layer.innerHTML = `<div class="shot-sel-rect" hidden></div><div class="shot-sel-hint">Drag to select an area · Esc to cancel</div>`;
        document.body.appendChild(layer);
        let start = null;
        const rectEl = layer.querySelector('.shot-sel-rect');
        const onDown = (e) => {
          start = { x: e.clientX, y: e.clientY };
          rectEl.hidden = false;
          rectEl.style.left = `${start.x}px`;
          rectEl.style.top = `${start.y}px`;
          rectEl.style.width = '0px';
          rectEl.style.height = '0px';
        };
        const onMove = (e) => {
          if (!start) return;
          const x = Math.min(start.x, e.clientX);
          const y = Math.min(start.y, e.clientY);
          rectEl.style.left = `${x}px`;
          rectEl.style.top = `${y}px`;
          rectEl.style.width = `${Math.abs(e.clientX - start.x)}px`;
          rectEl.style.height = `${Math.abs(e.clientY - start.y)}px`;
        };
        const finish = (cancel) => {
          document.removeEventListener('pointerdown', onDown);
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('keydown', onKey);
          layer.remove();
          if (cancel) return resolve(null);
          const r = rectEl.getBoundingClientRect();
          if (r.width < 12 || r.height < 12) return resolve(null);
          resolve({ x: r.left, y: r.top, w: r.width, h: r.height });
        };
        const onUp = () => finish(false);
        const onKey = (e) => { if (e.key === 'Escape') finish(true); };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('keydown', onKey);
      });
    }

    win._capture = async (m) => {
      mode = m || mode;
      // Hide this window so the screenshot does not capture itself
      const wasMin = win.minimized;
      win.el.style.opacity = '0';
      await countdown(delay);
      let crop = null;
      if (mode === 'area') {
        win.el.style.opacity = '1';
        const sel = await selectArea();
        win.el.style.opacity = '0';
        if (!sel) { win.el.style.opacity = '1'; if (wasMin) win.minimize(); return; }
        crop = sel;
      } else if (mode === 'window') {
        const focused = wm.focused();
        if (focused && focused.id !== win.id) {
          const r = focused.el.getBoundingClientRect();
          crop = { x: r.left, y: r.top, w: r.width, h: r.height };
        }
      }
      win.el.style.opacity = '0';
      const dataUrl = await captureDesktop({ crop });
      win.el.style.opacity = '1';
      if (wasMin) win.minimize();
      sound.play('shutter');
      const stamp = new Date();
      const name = `Screenshot ${stamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.jpg`;
      showPreview(dataUrl, name, null);
      const saved = saveToPictures(dataUrl);
      last = { dataUrl, name, path: saved };
      loaded();
      notify.post({ title: 'Screenshot captured', body: name, icon: args?.capture ? 'screenshot' : 'screenshot', colors: ['#5b6472', '#1c2129'], app: 'Screenshot', appId: 'screenshot' });
    };

    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      sound.play('click');
    }));
    root.querySelectorAll('[data-delay]').forEach((b) => b.addEventListener('click', () => {
      delay = Number(b.dataset.delay);
      root.querySelectorAll('[data-delay]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    root.querySelector('[data-capture]').addEventListener('click', () => win._capture(mode));

    root.querySelector('[data-hero]').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
    });

    toolbar.innerHTML = `<span class="fn-toolbar-title">Screenshot</span><span class="spacer"></span>
      <button class="btn small no-drag" data-tb-area>${glyph('corner', 11, 2)} Area</button>
      <button class="btn small primary no-drag" data-tb-full>${glyph('camera', 11, 1.9)} Capture</button>`;
    toolbar.querySelector('[data-tb-full]').addEventListener('click', () => win._capture('full'));
    toolbar.querySelector('[data-tb-area]').addEventListener('click', () => win._capture('area'));

    loaded();
    if (args?.capture) setTimeout(() => win._capture('full'), 300);
  },
};
