/* CanopyOS — dropdown + context menus with full keyboard navigation */
import { glyph } from '../core/icons.js';
import { sound } from '../core/sound.js';

let current = null;
let currentAnchor = null;

export function closeMenu() {
  if (current) {
    current._cleanup?.();
    current.remove();
    current = null;
  }
  if (currentAnchor) {
    currentAnchor.classList.remove('open');
    currentAnchor = null;
  }
  document.querySelectorAll('.menu').forEach((m) => m.remove());
}

function buildItem(item) {
  if (item.sep) {
    const d = document.createElement('div');
    d.className = 'menu-sep';
    return d;
  }
  const el = document.createElement('button');
  el.className = `menu-item${item.disabled ? ' disabled' : ''}`;
  el.type = 'button';
  el.dataset.action = item.id || item.label;
  el.innerHTML = `<span class="mi-check">${item.checked ? glyph('check', 11, 3) : ''}</span><span class="mi-label">${item.label || ''}</span>${item.shortcut ? `<span class="mi-shortcut">${item.shortcut}</span>` : ''}`;
  if (!item.disabled) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      try { item.action?.(); } catch (err) { console.error(err); }
    });
  }
  if (item.href) el.dataset.href = item.href;
  return el;
}

export function showMenuAt(x, y, items, opts = {}) {
  closeMenu();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  items.forEach((item) => menu.appendChild(buildItem(item)));
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  let left = opts.align === 'right' ? x - rect.width : x;
  let top = y;
  if (left + rect.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - rect.width - 8);
  if (top + rect.height > window.innerHeight - 8) {
    const flipped = y - rect.height - (opts.gap || 8);
    top = flipped > 8 ? flipped : Math.max(8, window.innerHeight - rect.height - 8);
  }
  menu.style.left = `${Math.max(6, left)}px`;
  menu.style.top = `${Math.max(4, top)}px`;
  current = menu;
  sound.play('click');

  const focusables = [...menu.querySelectorAll('.menu-item:not(.disabled)')];
  if (focusables[0]) focusables[0].classList.add('active');

  const keyHandler = (e) => {
    const active = menu.querySelector('.menu-item.active');
    const idx = focusables.indexOf(active);
    const moveTo = (next) => {
      if (!focusables.length) return;
      active?.classList.remove('active');
      focusables[(next + focusables.length) % focusables.length].classList.add('active');
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveTo(idx - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); (menu.querySelector('.menu-item.active') || focusables[0])?.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  };
  setTimeout(() => document.addEventListener('keydown', keyHandler), 0);
  menu._cleanup = () => document.removeEventListener('keydown', keyHandler);
  return menu;
}

export function showMenu(anchor, items, opts = {}) {
  if (currentAnchor === anchor && current) { closeMenu(); return null; }
  closeMenu();
  const r = anchor.getBoundingClientRect();
  const menu = showMenuAt(r.left, r.bottom + 4, items, opts);
  currentAnchor = anchor;
  anchor.classList.add('open');
  return menu;
}

document.addEventListener('pointerdown', (e) => {
  if (!current) return;
  if (e.target.closest('.menu')) return;
  if (currentAnchor && e.target.closest('.mb-item, .mb-status')) return;
  closeMenu();
}, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && current) { closeMenu(); }
});

export function standardMenus(appName, extras = {}) {
  return [
    { label: 'File', items: extras.file || [
      { label: 'New Window', shortcut: '⌘N', action: () => extras.onNew?.() },
      { sep: true },
      { label: 'Close Window', shortcut: '⌘W', action: () => extras.closeWin?.() },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: '⌘Z', action: () => document.execCommand?.('undo') },
      { label: 'Redo', shortcut: '⇧⌘Z', action: () => document.execCommand?.('redo') },
      { sep: true },
      { label: 'Cut', shortcut: '⌘X', action: () => document.execCommand?.('cut') },
      { label: 'Copy', shortcut: '⌘C', action: () => document.execCommand?.('copy') },
      { label: 'Paste', shortcut: '⌘V', action: () => document.execCommand?.('paste') },
      { label: 'Select All', shortcut: '⌘A', action: () => document.execCommand?.('selectAll') },
    ] },
    { label: 'View', items: extras.view || [
      { label: 'Enter Full Screen', shortcut: '^⌘F', action: () => extras.toggleFullscreen?.() },
    ] },
    { label: 'Window', items: [
      { label: 'Minimize', shortcut: '⌘M', action: () => extras.minimize?.() },
      { label: 'Zoom', action: () => extras.zoom?.() },
      { label: 'Tile Windows', action: () => extras.tile?.() },
      { sep: true },
      { label: 'Bring All to Front', action: () => extras.bringFront?.() },
    ] },
    { label: 'Help', items: [
      { label: `${appName} Help`, action: () => extras.help?.() },
      { label: 'Keyboard Shortcuts', shortcut: '⌘/', action: () => extras.shortcuts?.() },
    ] },
  ];
}
