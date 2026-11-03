/* CanopyOS — Paint */
import { fs, HOME } from '../core/fs.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { notify } from '../core/notify.js';
import { download } from '../core/util.js';

const PALETTE = ['#000000', '#ffffff', '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#12a37c', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#8b5e34', '#94a3b8', '#1f2937'];
const TOOLS = [
  ['brush', 'brush', 'Brush'], ['marker', 'feather', 'Marker'], ['eraser', 'xCircle', 'Eraser'],
  ['line', 'minus', 'Line'], ['rect', 'grid', 'Rectangle'], ['ellipse', 'compass', 'Ellipse'],
  ['spray', 'sparkle', 'Spray'], ['fill', 'paint', 'Fill'],
];

export default {
  id: 'paint',
  name: 'Paint',
  icon: 'paint',
  colors: ['#fef3c7', '#f59e0b'],
  iconOpts: { strokeWidth: 1.7 },
  width: 900, height: 640,
  keywords: ['draw', 'sketch', 'canvas', 'art', 'brush'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Canvas', shortcut: '⌘N', action: () => win?._clear() },
      { label: 'Save to Pictures', shortcut: '⌘S', action: () => win?._save() },
      { label: 'Export PNG', action: () => win?._export() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: '⌘Z', action: () => win?._undo() },
      { label: 'Redo', shortcut: '⇧⌘Z', action: () => win?._redo() },
      { label: 'Clear', action: () => win?._clear() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let tool = 'brush';
    let color = '#1f2937';
    let size = 6;
    let drawing = false;
    let start = null;
    let snapshot = null;
    let undoStack = [];
    let redoStack = [];

    root.innerHTML = `<div class="paint">
      <aside class="paint-tools">
        <div class="paint-tool-grid">${TOOLS.map(([id, icon, label]) => `<button class="paint-tool ${id === tool ? 'on' : ''}" data-tool="${id}" title="${label}">${glyph(icon, 16, 1.8)}</button>`).join('')}</div>
        <div class="paint-palette">${PALETTE.map((c) => `<button class="paint-swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
          <label class="paint-custom" title="Custom color"><input type="color" value="${color}" data-custom></label></div>
        <div class="paint-size"><span class="tiny muted">Size ${size}</span><input type="range" min="1" max="40" value="${size}" data-size></div>
        <div class="paint-actions">
          <button class="btn small" data-undo title="Undo">${glyph('refresh', 12, 2)} Undo</button>
          <button class="btn small" data-clear title="Clear">Clear</button>
        </div>
        <div class="paint-foot tiny muted">Draw with mouse, pen or touch</div>
      </aside>
      <section class="paint-canvas-wrap">
        <canvas class="paint-canvas" data-canvas></canvas>
        <div class="paint-cursor" data-cursor hidden></div>
      </section>
    </div>`;

    const canvas = root.querySelector('[data-canvas]');
    const ctx = canvas.getContext('2d');
    const cursor = root.querySelector('[data-cursor]');

    function resize() {
      const wrap = canvas.parentElement;
      const data = canvas.width ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(200, wrap.clientWidth) * dpr;
      canvas.height = Math.max(200, wrap.clientHeight) * dpr;
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (data) {
        try { ctx.putImageData(data, 0, 0); } catch (e) { /* ignore resize restore */ }
      }
    }

    const pushHistory = () => {
      try {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift();
        redoStack = [];
      } catch (e) { /* canvas may be tainted */ }
    };

    function restore(dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      };
      img.src = dataUrl;
    }

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    function strokeStyle() {
      ctx.globalAlpha = tool === 'marker' ? 0.35 : 1;
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'marker' ? size * 2 : size;
    }

    function spray(p) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = color;
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * size * 3;
        ctx.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;
    }

    function down(e) {
      if (e.button !== 0) return;
      drawing = true;
      start = pos(e);
      pushHistory();
      strokeStyle();
      if (tool === 'spray') { spray(start); return; }
      if (tool === 'fill') {
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        drawing = false;
        return;
      }
      if (tool === 'brush' || tool === 'marker' || tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(start.x + 0.01, start.y);
        ctx.stroke();
      } else {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      sound.play('click');
    }

    function move(e) {
      const p = pos(e);
      if (!drawing) {
        cursor.hidden = false;
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        cursor.style.width = `${Math.max(6, size)}px`;
        cursor.style.height = `${Math.max(6, size)}px`;
        cursor.style.borderColor = color;
        return;
      }
      if (tool === 'brush' || tool === 'marker' || tool === 'eraser') {
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (tool === 'spray') {
        spray(p);
      } else {
        ctx.putImageData(snapshot, 0, 0);
        strokeStyle();
        ctx.beginPath();
        if (tool === 'line') { ctx.moveTo(start.x, start.y); ctx.lineTo(p.x, p.y); }
        if (tool === 'rect') ctx.rect(start.x, start.y, p.x - start.x, p.y - start.y);
        if (tool === 'ellipse') ctx.ellipse((start.x + p.x) / 2, (start.y + p.y) / 2, Math.abs(p.x - start.x) / 2, Math.abs(p.y - start.y) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function up() {
      if (!drawing) return;
      drawing = false;
      ctx.closePath();
      ctx.globalAlpha = 1;
      snapshot = null;
    }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', () => { up(); cursor.hidden = true; });

    root.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
      tool = b.dataset.tool;
      root.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      color = b.dataset.color;
      root.querySelectorAll('[data-swatch]').forEach((x) => x.classList.toggle('on', x === b));
      root.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    root.querySelector('[data-custom]').addEventListener('input', (e) => { color = e.target.value; });
    root.querySelector('[data-size]').addEventListener('input', (e) => {
      size = Number(e.target.value);
      root.querySelector('.paint-size .muted').textContent = `Size ${size}`;
    });
    root.querySelector('[data-undo]').addEventListener('click', () => win._undo());
    root.querySelector('[data-clear]').addEventListener('click', () => win._clear());

    win._undo = () => {
      const last = undoStack.pop();
      if (!last) return;
      redoStack.push(canvas.toDataURL());
      restore(last);
    };
    win._redo = () => {
      const next = redoStack.pop();
      if (!next) return;
      undoStack.push(canvas.toDataURL());
      restore(next);
    };
    win._clear = () => {
      pushHistory();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    win._save = () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        let name = `Painting ${new Date().toISOString().slice(0, 10)}.png`;
        let i = 2;
        while (fs.exists(`${HOME}/Pictures/${name}`)) name = `Painting ${new Date().toISOString().slice(0, 10)} ${i++}.png`;
        fs.createFile(`${HOME}/Pictures/${name}`, 'Painting created in CanopyOS', { dataUrl });
        notify.post({ title: 'Painting saved', body: name, icon: 'paint', colors: ['#fef3c7', '#f59e0b'], app: 'Paint', appId: 'paint' });
        sound.play('success');
      } catch (e) {
        notify.post({ title: 'Could not save', body: 'The browser blocked canvas export.', icon: 'warning' });
      }
    };
    win._export = () => {
      try {
        canvas.toBlob((blob) => download(`canopy-painting-${Date.now()}.png`, blob, 'image/png'));
      } catch (e) { win._save(); }
    };

    toolbar.innerHTML = `<span class="fn-toolbar-title">Paint</span><span class="spacer"></span>
      <button class="icon-btn no-drag" data-redo title="Redo">${glyph('refresh', 15, 1.8)}</button>
      <button class="btn small no-drag" data-save>${glyph('download', 11, 2)} Save</button>`;
    toolbar.querySelector('[data-redo]').addEventListener('click', () => win._redo());
    toolbar.querySelector('[data-save]').addEventListener('click', () => win._save());

    const observer = new ResizeObserver(() => resize());
    observer.observe(canvas.parentElement);
    win.onClose(() => observer.disconnect());
    resize();
    setTimeout(resize, 80);
  },
};
