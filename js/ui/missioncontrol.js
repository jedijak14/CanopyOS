/* CanopyOS — Mission Control and Spaces (real window thumbnails via transforms) */
import { wm } from '../core/wm.js';
import { store } from '../core/store.js';

import { sound } from '../core/sound.js';

const el = () => document.getElementById('mission-control');
let isOpen = false;

function exitForAll() {
  document.querySelectorAll('.win.mc-transformed').forEach((w) => {
    w.style.transform = '';
    w.style.transition = '';
    w.style.transformOrigin = '';
    w.classList.remove('mc-transformed');
  });
  document.querySelectorAll('.mc-label').forEach((l) => l.remove());
  document.getElementById('windows')?.classList.remove('mc-mode');
}

function render() {
  const c = el();
  if (!c) return;
  exitForAll();
  const spaces = store.get('spaces', 3);
  const wins = [...wm.wins.values()].filter((w) => !w.minimized && w.space === wm.currentSpace);

  c.innerHTML = `
    <div class="mc-spaces" id="mc-spaces">
      ${Array.from({ length: spaces }, (_, i) => `<div class="mc-space ${i === wm.currentSpace ? 'on' : ''}" data-mc-space="${i}">
        <span>Desktop ${i + 1}</span>
        ${spaces > 1 ? `<button class="mc-space-x" data-mc-remove="${i}" title="Remove space">✕</button>` : ''}
      </div>`).join('')}
      <div class="mc-space" data-mc-space="add" style="width:56px" title="Add space"><span class="mc-add">+</span></div>
    </div>
    <div class="mc-windows" id="mc-wins">
      ${wins.length ? '' : '<div class="empty-state" style="color:#fff;opacity:.7">No open windows on this desktop</div>'}
    </div>`;

  c.querySelectorAll('[data-mc-remove]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      wm.removeSpace(Number(b.dataset.mcRemove));
      render();
    });
  });
  c.querySelectorAll('[data-mc-space]').forEach((s) => {
    s.addEventListener('click', () => {
      if (s.dataset.mcSpace === 'add') { wm.addSpace(); render(); return; }
      const n = Number(s.dataset.mcSpace);
      if (n === wm.currentSpace) return;
      wm.setSpace(n);
      render();
    });
  });

  if (!wins.length) return;

  const cols = Math.min(3, Math.ceil(Math.sqrt(wins.length)));
  const rows = Math.ceil(wins.length / cols);
  const areaTop = 176;
  const areaBottom = 108;
  const gapX = 34;
  const gapY = 56;
  const areaW = window.innerWidth - 80;
  const areaH = window.innerHeight - areaTop - areaBottom;
  const cellW = (areaW - gapX * (cols - 1)) / cols;
  const cellH = (areaH - gapY * (rows - 1)) / rows;

  document.getElementById('windows').classList.add('mc-mode');

  wins.forEach((w, i) => {
    const r = w.el.getBoundingClientRect();
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = 40 + col * (cellW + gapX);
    const cellY = areaTop + row * (cellH + gapY);
    const scale = Math.min((cellW - 10) / r.width, (cellH - 30) / r.height, 1);
    const scaledW = r.width * scale;
    const scaledH = r.height * scale;
    const slotX = cellX + (cellW - scaledW) / 2;
    const slotY = cellY + Math.max(0, (cellH - 30 - scaledH) / 2);

    w.el.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1)';
    w.el.style.transformOrigin = 'top left';
    w.el.style.transform = `translate(${slotX - r.left}px, ${slotY - r.top}px) scale(${scale})`;
    w.el.classList.add('mc-transformed');
    w.el.style.zIndex = String(8800 + i);
    w.el.style.pointerEvents = 'auto';

    const label = document.createElement('div');
    label.className = 'mc-label';
    label.style.cssText = `position:absolute;left:${slotX}px;top:${slotY + scaledH + 8}px;width:${scaledW}px;display:flex;align-items:center;gap:6px;color:#fff;font-size:11.5px;text-shadow:0 1px 6px rgba(0,0,0,.6);z-index:${8799 + i}`;
    label.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.titleEl.textContent}</span>
      <button class="mc-close" title="Close window" aria-label="Close window" style="width:18px;height:18px;border-radius:50%;background:#ff5f57;border:0;color:#7a0d0d;font-size:10px;display:grid;place-items:center">✕</button>`;
    label.querySelector('.mc-close').addEventListener('click', (e) => {
      e.stopPropagation();
      w.close();
      document.body.dataset.mcRefresh = String(Date.now());
      render();
    });
    label.addEventListener('click', () => { exit(); wm.focus(w); });
    document.getElementById('windows').appendChild(label);

    const onClick = (e) => {
      if (e.target.closest('.mc-close')) return;
      e.stopPropagation();
      exit();
      wm.focus(w);
    };
    w.el.addEventListener('click', onClick, { capture: true });
    w.el._mcHandler = onClick;
  });
}

export function openMissionControl() {
  const c = el();
  if (!c || isOpen) return;
  isOpen = true;
  c.hidden = false;
  sound.play('swish');
  render();
}

export function closeMissionControl() {
  const c = el();
  if (!c || !isOpen) return;
  isOpen = false;
  [...wm.wins.values()].forEach((w) => {
    if (w._mcHandler) { w.el.removeEventListener('click', w._mcHandler, true); w._mcHandler = null; }
    w.el.style.transform = '';
    w.el.style.transition = '';
    w.el.classList.remove('mc-transformed');
  });
  document.querySelectorAll('.mc-label').forEach((l) => l.remove());
  document.getElementById('windows')?.classList.remove('mc-mode');
  c.hidden = true;
  c.innerHTML = '';
}

export function exit() { closeMissionControl(); }

export function toggleMissionControl() {
  if (isOpen) closeMissionControl();
  else openMissionControl();
}

document.addEventListener('keydown', (e) => {
  if (isOpen && e.key === 'Escape') { e.preventDefault(); closeMissionControl(); }
});
window.addEventListener('canopy:space', () => { if (isOpen) render(); });
