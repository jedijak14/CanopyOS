/* CanopyOS — desktop icons, context menu, hot corners */
import { fs, HOME } from '../core/fs.js';
import { store } from '../core/store.js';
import { wm } from '../core/wm.js';
import { fileIcon } from '../core/icons.js';
import { sound } from '../core/sound.js';
import { openPath, newFolder, newFile } from '../core/open.js';
import { showMenuAt } from './menu.js';
import { promptModal, alertModal } from './modal.js';
import { toggleMissionControl } from './missioncontrol.js';
import { toggleLaunchpad } from './launchpad.js';
import { openNotificationCenter } from './notificationcenter.js';

const DESKTOP = `${HOME}/Desktop`;
const root = () => document.getElementById('desktop-icons');

let selected = null;

function sortedItems() {
  const items = fs.list(DESKTOP);
  const mode = store.get('desktopSort', 'name');
  return items.slice().sort((a, b) => {
    if (mode === 'kind') return (a.type + a.name).localeCompare(b.type + b.name);
    if (mode === 'date') return (b.node.meta?.modified || 0) - (a.node.meta?.modified || 0);
    return a.name.localeCompare(b.name);
  });
}

export function renderDesktop() {
  const el = root();
  if (!el) return;
  if (!store.get('desktopIcons')) { el.innerHTML = ''; return; }
  const items = sortedItems();
  el.innerHTML = items.map((it) => `
    <div class="desk-icon" data-path="${it.path}" data-name="${it.name}" role="button" tabindex="0" title="${it.name}">
      <div class="di-art">${fileIcon(it.node)}</div>
      <div class="di-name">${it.name}</div>
    </div>`).join('');

  el.querySelectorAll('.desk-icon').forEach((icon) => {
    icon.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      el.querySelectorAll('.desk-icon').forEach((i) => i.classList.remove('selected'));
      icon.classList.add('selected');
      selected = icon.dataset.path;
    });
    icon.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openPath(icon.dataset.path);
    });
    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openPath(icon.dataset.path);
      if (e.key === 'Backspace' || e.key === 'Delete') removePath(icon.dataset.path);
    });
    icon.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      icon.classList.add('selected');
      selected = icon.dataset.path;
      iconMenu(icon.dataset.path, e.clientX, e.clientY);
    });
  });
}
window.addEventListener('canopy:fs', (e) => {
  if (!e.detail?.path || e.detail.path.startsWith(DESKTOP)) renderDesktop();
});

function removePath(path) {
  fs.remove(path, { trash: true });
  sound.play('trash');
}

async function iconMenu(path, x, y) {
  const node = fs.stat(path);
  showMenuAt(x, y, [
    { label: 'Open', action: () => openPath(path) },
    { label: node?.type === 'folder' ? 'Open in Finder' : 'Open With Preview', action: () => (node?.type === 'folder' ? wm.open('finder', { args: { path } }) : wm.open('preview', { args: { path } })) },
    { sep: true },
    {
      label: 'Rename…', action: async () => {
        const name = await promptModal({ title: 'Rename', value: node?.name, okLabel: 'Rename' });
        if (name) {
          try { fs.rename(path, name); } catch (err) { alertModal({ title: 'Could not rename', body: err.message, art: 'warning' }); }
        }
      },
    },
    { label: 'Duplicate', action: () => fs.copy(path, DESKTOP) },
    { sep: true },
    { label: 'Move to Trash', action: () => removePath(path) },
    { sep: true },
    { label: 'Get Info', action: showInfo(path) },
  ]);
}

function showInfo(path) {
  const node = fs.stat(path);
  if (!node) return;
  const isFile = node.type === 'file';
  alertModal({
    title: node.name,
    art: '',
    body: `<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
      <div style="width:52px;height:52px">${fileIcon(node)}</div>
      <div><b style="color:var(--text)">${node.name}</b><div class="tiny muted">${isFile ? 'Document' : 'Folder'}</div></div></div>
      <div class="tiny" style="line-height:1.8">
        <div><b style="color:var(--text)">Where</b> &nbsp; ${path.replace(/\/[^/]+$/, '')}</div>
        <div><b style="color:var(--text)">Size</b> &nbsp; ${isFile ? `${(node.content || '').length} bytes` : `${node.children.length} items`}</div>
        <div><b style="color:var(--text)">Created</b> &nbsp; ${new Date(node.meta.created).toLocaleString()}</div>
        <div><b style="color:var(--text)">Modified</b> &nbsp; ${new Date(node.meta.modified).toLocaleString()}</div>
        ${node.meta?.tags?.length ? `<div><b style="color:var(--text)">Tags</b> &nbsp; ${node.meta.tags.join(', ')}</div>` : ''}
      </div>`,
    okLabel: 'Done',
  });
}

function desktopMenu(x, y) {
  showMenuAt(x, y, [
    {
      label: 'New Folder', action: async () => {
        const name = await promptModal({ title: 'New Folder', value: 'Untitled Folder', okLabel: 'Create' });
        if (name) { newFolder(DESKTOP, name); sound.play('success'); }
      },
    },
    {
      label: 'New Text File', action: () => { newFile(DESKTOP); sound.play('success'); },
    },
    { sep: true },
    { label: 'Sort By Name', checked: store.get('desktopSort', 'name') === 'name', action: () => { store.set('desktopSort', 'name'); renderDesktop(); } },
    { label: 'Sort By Kind', checked: store.get('desktopSort') === 'kind', action: () => { store.set('desktopSort', 'kind'); renderDesktop(); } },
    { label: 'Sort By Date', checked: store.get('desktopSort') === 'date', action: () => { store.set('desktopSort', 'date'); renderDesktop(); } },
    { sep: true },
    { label: 'Show Widgets', checked: store.get('widgets'), action: () => store.set('widgets', !store.get('widgets')) },
    { label: 'Show Desktop Icons', checked: store.get('desktopIcons'), action: () => { store.set('desktopIcons', !store.get('desktopIcons')); renderDesktop(); } },
    { label: 'Change Wallpaper…', action: () => wm.open('settings', { args: { tab: 'appearance' } }) },
    { sep: true },
    { label: 'Mission Control', action: () => toggleMissionControl() },
    { label: 'Open Terminal Here', action: () => wm.open('terminal', { args: { cwd: DESKTOP } }) },
    { label: 'Get Info', action: () => showInfo(DESKTOP) },
  ]);
}

export function initDesktop() {
  renderDesktop();
  const desktop = document.getElementById('desktop');
  desktop.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.desk-icon') || e.target.closest('.win') || e.target.closest('#widgets')) return;
    selected = null;
    document.querySelectorAll('.desk-icon.selected').forEach((i) => i.classList.remove('selected'));
  });
  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.win')) return;
    e.preventDefault();
    if (!e.target.closest('.desk-icon')) desktopMenu(e.clientX, e.clientY);
  });
  // double-click empty desktop opens Finder home
  desktop.addEventListener('dblclick', (e) => {
    if (e.target.closest('.desk-icon') || e.target.closest('.win')) return;
    wm.open('finder', { args: { path: HOME } });
  });
  // Delete key removes selection
  document.addEventListener('keydown', (e) => {
    if (!selected) return;
    if ((e.key === 'Backspace' || e.key === 'Delete') && document.activeElement === document.body) {
      removePath(selected);
      selected = null;
    }
  });
  window.addEventListener('canopy:setting', (e) => {
    if (/desktopIcons|desktopSort/.test(e.detail?.key || '')) renderDesktop();
  });
  initHotCorners();
}

/* ---------- Hot corners ---------- */
let lastCorner = 0;
function cornerAction(action) {
  if (!action || action === 'off') return;
  if (Date.now() - lastCorner < 900) return;
  lastCorner = Date.now();
  if (action === 'mission') toggleMissionControl();
  else if (action === 'launchpad') toggleLaunchpad();
  else if (action === 'notification') openNotificationCenter();
  else if (action === 'showdesktop') wm.minimizeAll();
}

function initHotCorners() {
  document.addEventListener('pointermove', (e) => {
    if (document.getElementById('lockscreen')?.hidden === false) return;
    if (document.querySelector('#spotlight:not([hidden]), #launchpad:not([hidden]), #mission-control:not([hidden])')) return;
    if (e.target.closest('.win') || e.target.closest('#overlays')) return;
    const edge = 3;
    const nearLeft = e.clientX <= edge;
    const nearRight = e.clientX >= window.innerWidth - edge;
    const nearTop = e.clientY <= edge;
    const nearBottom = e.clientY >= window.innerHeight - edge;
    if (nearTop && nearLeft) cornerAction(store.get('hotCornerTL'));
    else if (nearTop && nearRight) cornerAction(store.get('hotCornerTR'));
    else if (nearBottom && nearLeft) cornerAction(store.get('hotCornerBL'));
    else if (nearBottom && nearRight) cornerAction(store.get('hotCornerBR'));
  });
}
