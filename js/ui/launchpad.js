/* CanopyOS — Launchpad with pages, search and keyboard navigation */
import { allApps, wm } from '../core/wm.js';
import { appIcon } from '../core/icons.js';
import { sound } from '../core/sound.js';
import { escapeHtml } from '../core/util.js';

const PER_PAGE = 20;
let page = 0;
let query = '';
let isOpen = false;

const el = () => document.getElementById('launchpad');

function apps() {
  return allApps().filter((a) => !a.hidden).sort((a, b) => a.name.localeCompare(b.name));
}

function filtered() {
  if (!query) return apps();
  const q = query.toLowerCase();
  return apps().filter((a) => a.name.toLowerCase().includes(q) || (a.keywords || []).some((k) => k.includes(q)));
}

function render() {
  const c = el();
  if (!c) return;
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  page = Math.min(page, pages - 1);
  const slice = query ? list : list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  c.innerHTML = `
    <div class="lp-search"><input type="search" id="lp-input" placeholder="Search apps" autocomplete="off" value="${escapeHtml(query)}" aria-label="Search apps" /></div>
    <div class="lp-grid" id="lp-grid">
      ${slice.map((a) => `<button class="lp-app" data-app="${a.id}">${appIcon(a.icon, a.colors, a.iconOpts)}<span>${escapeHtml(a.name)}</span></button>`).join('')}
      ${slice.length ? '' : '<div class="empty-state" style="grid-column:1/-1;color:#fff;opacity:.7">No apps found</div>'}
    </div>
    ${query ? '' : `<div class="lp-page-dots">${Array.from({ length: pages }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>`}`;

  const input = c.querySelector('#lp-input');
  input.value = query;
  input.addEventListener('input', () => { query = input.value; page = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeLaunchpad(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = filtered()[0];
      if (first) { closeLaunchpad(); wm.open(first.id); }
    }
  });
  setTimeout(() => input.focus(), 30);

  c.querySelectorAll('.lp-app').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeLaunchpad();
      wm.open(btn.dataset.app);
    });
  });
  c.dataset.page = String(page);
}

function turn(dir) {
  const pages = Math.max(1, Math.ceil(filtered().length / PER_PAGE));
  page = (page + dir + pages) % pages;
  sound.play('swish');
  render();
}

export function openLaunchpad() {
  const c = el();
  if (!c || isOpen) return;
  isOpen = true;
  page = 0;
  query = '';
  c.hidden = false;
  render();
  sound.play('open');
}

export function closeLaunchpad() {
  const c = el();
  if (!c || !isOpen) return;
  isOpen = false;
  c.hidden = true;
  c.innerHTML = '';
}

export function toggleLaunchpad() {
  if (isOpen) closeLaunchpad();
  else openLaunchpad();
}

document.addEventListener('pointerdown', (e) => {
  if (!isOpen) return;
  if (e.target.closest('.lp-app, .lp-search, .lp-page-dots')) return;
  if (e.target.closest('#dock-shell')) return;
  closeLaunchpad();
}, true);

document.addEventListener('keydown', (e) => {
  if (!isOpen) return;
  if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) && !e.target.closest('input')) {
    e.preventDefault();
    turn(e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : -1);
  }
  if (e.key === 'Escape') { e.preventDefault(); closeLaunchpad(); }
});

document.addEventListener('wheel', (e) => {
  if (!isOpen || e.target.closest('.lp-grid')) return;
  turn(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
