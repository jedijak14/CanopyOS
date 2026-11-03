/* CanopyOS — Quick Look preview overlay */
import { fs, ext } from '../core/fs.js';
import { glyph, fileIcon } from '../core/icons.js';
import { escapeHtml, formatBytes } from '../core/util.js';
import { sound } from '../core/sound.js';

let isOpen = false;

export function openQuickLook(path) {
  const c = document.getElementById('quicklook');
  const node = fs.stat(path);
  if (!c || !node) return;
  const e = ext(node.name);
  let body = '';
  const imageData = node.meta?.dataUrl;
  if (node.type === 'folder') {
    const items = fs.list(path);
    body = `<div class="tiny muted" style="margin-bottom:10px">${items.length} item${items.length === 1 ? '' : 's'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">
        ${items.map((i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px;border-radius:8px;background:var(--hover);text-align:center">
          <div style="width:38px;height:38px">${fileIcon(i.node)}</div><div class="tiny" style="word-break:break-word">${escapeHtml(i.name)}</div></div>`).join('')}
      </div>`;
  } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(e) && imageData) {
    body = `<img class="ql-image" src="${imageData}" alt="${escapeHtml(node.name)}" />`;
  } else if (node.meta?.art) {
    body = `<div style="height:360px;border-radius:12px;background:linear-gradient(135deg, ${node.meta.art[0]}, ${node.meta.art[1]});display:grid;place-items:center;color:#fff;font-size:20px">${escapeHtml(node.meta.title || node.name)}</div>`;
  } else if (node.type === 'file') {
    const content = node.content || '';
    body = content
      ? `<pre>${escapeHtml(content.slice(0, 12000))}</pre>`
      : `<div class="empty-state">${glyph('file', 38)}<div>This file is empty.</div></div>`;
  }
  c.innerHTML = `<div class="ql-card" role="dialog" aria-label="Quick Look">
    <div class="ql-head">
      <div style="width:20px;height:20px">${fileIcon(node)}</div>
      <b>${escapeHtml(node.name)}</b>
      <span class="tiny muted">${node.type === 'file' ? formatBytes((node.content || '').length) : `${node.children.length} items`}</span>
      <button class="icon-btn" data-ql-close aria-label="Close">${glyph('close', 13, 2)}</button>
    </div>
    <div class="ql-body">${body}</div>
  </div>`;
  c.hidden = false;
  isOpen = true;
  c.querySelector('[data-ql-close]').addEventListener('click', closeQuickLook);
  sound.play('pop');
}

export function closeQuickLook() {
  const c = document.getElementById('quicklook');
  if (!c) return;
  c.hidden = true;
  c.innerHTML = '';
  isOpen = false;
}

document.addEventListener('keydown', (e) => {
  if (isOpen && (e.key === 'Escape' || e.key === ' ')) { e.preventDefault(); closeQuickLook(); }
});
document.addEventListener('pointerdown', (e) => {
  if (!isOpen) return;
  if (e.target.closest('.ql-card')) return;
  closeQuickLook();
}, true);
