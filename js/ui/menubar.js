/* CanopyOS — menu bar: system menu, app menus, status items, clock */
import { CANOPY_LOGO, glyph } from '../core/icons.js';
import { store } from '../core/store.js';
import { wm, getApp } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { fmtTime } from '../core/util.js';
import { showMenu, closeMenu, standardMenus } from './menu.js';
import { system } from './system.js';
import { toggleSpotlight } from './spotlight.js';
import { toggleControlCenter, closeControlCenter } from './controlcenter.js';
import { toggleNotificationCenter, closeNotificationCenter } from './notificationcenter.js';
import { toggleLaunchpad } from './launchpad.js';
import { toggleMissionControl } from './missioncontrol.js';

let battery = { level: 0.86, charging: false };
let clockEl = null;

function batterySvg(level, charging) {
  const w = Math.max(2, Math.round(16 * level));
  const color = level < 0.15 ? '#ff453a' : level < 0.3 ? '#ff9f0a' : 'currentColor';
  return `<svg viewBox="0 0 26 13" width="26" height="13" aria-hidden="true">
    <rect x="0.75" y="0.75" width="21" height="11.5" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.2"/>
    <rect x="2.5" y="2.5" width="${w}" height="8" rx="2" fill="${charging ? '#32d74b' : color}"/>
    ${charging ? `<path d="M12 2.5l-3.2 4.3h2.3L10 10.5l3.6-4.6h-2.2z" fill="#fff" stroke="none"/>` : ''}
    <path d="M23.2 4.5v4" stroke="currentColor" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function clockText() {
  const d = new Date();
  const t = fmtTime(d, { h24: store.get('clock24'), seconds: store.get('showSeconds') });
  if (!store.get('showDate')) return t;
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${date}  ${t}`;
}

export function updateClock() {
  if (clockEl) clockEl.textContent = clockText();
}

function appMenuItems(app) {
  const win = wm.focused();
  return [
    { label: `About ${app.name}`, action: () => system.about() },
    { sep: true },
    { label: 'Settings…', shortcut: '⌘,', action: () => wm.open('settings') },
    { label: 'App Store…', action: () => wm.open('appstore') },
    { sep: true },
    { label: `Hide ${app.name}`, shortcut: '⌘H', action: () => win?.minimize() },
    { label: 'Hide Others', shortcut: '⌥⌘H', action: () => wm.wins.forEach((w) => { if (w.appId !== app.id) w.minimize(); }) },
    { sep: true },
    { label: `Quit ${app.name}`, shortcut: '⌘Q', action: () => wm.closeApp(app.id) },
  ];
}

function genericMenus(app) {
  const win = wm.focused();
  if (app?.menus) return typeof app.menus === 'function' ? app.menus(win) : app.menus;
  return standardMenus(app?.name || 'CanopyOS', {
    closeWin: () => win?.close(),
    minimize: () => win?.minimize(),
    zoom: () => win?.toggleMaximize(),
    tile: () => wm.tile(),
    toggleFullscreen: () => win?.toggleMaximize(),
    bringFront: () => win && wm.focus(win),
    shortcuts: () => system.shortcuts(),
    help: () => system.about(),
    onNew: () => win && wm.open(win.appId),
  });
}

let lastRender = 0;
export function renderMenubar() {
  const bar = document.getElementById('menubar');
  if (!bar) return;
  const now = Date.now();
  if (now - lastRender < 40) return;
  lastRender = now;
  closeMenu();

  const win = wm.focused();
  const app = win ? getApp(win.appId) : getApp('finder');
  const appName = app?.name || 'Finder';

  const left = document.createElement('div');
  left.className = 'mb-left';
  left.innerHTML = `<button class="mb-item logo" id="mb-logo" aria-label="Canopy menu" title="Canopy">${CANOPY_LOGO}</button>
    <button class="mb-item strong" id="mb-appname">${appName}</button>
    <div class="hstack" style="gap:1px" id="mb-appmenus"></div>`;

  const right = document.createElement('div');
  right.className = 'mb-right';
  right.innerHTML = `
    <span class="mb-dnd-dot" title="Do Not Disturb"></span>
    <button class="mb-status" id="mb-batt" title="Battery">${batterySvg(battery.level, battery.charging)}${store.get('batteryPct') ? `<span class="mb-battery">${Math.round(battery.level * 100)}%</span>` : ''}</button>
    <button class="mb-status" id="mb-wifi" title="Wi-Fi">${store.get('wifi') ? glyph('wifi', 17, 1.8) : glyph('wifiOff', 17, 1.8)}</button>
    <button class="mb-status" id="mb-cc" title="Control Center">${glyph('sliders', 17, 1.8)}</button>
    <button class="mb-status" id="mb-search" title="Spotlight search">${glyph('search', 16, 1.9)}</button>
    <button class="mb-status" id="mb-clock" title="Notification Center"><span class="mb-clock"></span></button>`;

  bar.replaceChildren(left, right);
  clockEl = bar.querySelector('.mb-clock');
  updateClock();

  const appMenus = bar.querySelector('#mb-appmenus');
  genericMenus(app).forEach((menu) => {
    const btn = document.createElement('button');
    btn.className = 'mb-item mb-app-menu';
    btn.textContent = menu.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeControlCenter(); closeNotificationCenter();
      showMenu(btn, typeof menu.items === 'function' ? menu.items() : menu.items);
    });
    appMenus.appendChild(btn);
  });

  bar.querySelector('#mb-logo').addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(e.currentTarget, [
      { label: 'About This Canopy', action: () => system.about() },
      { sep: true },
      { label: 'System Settings…', shortcut: '⌘,', action: () => wm.open('settings', { args: { tab: 'general' } }) },
      { label: 'App Store…', action: () => wm.open('appstore') },
      { label: 'Launchpad', action: () => toggleLaunchpad() },
      { label: 'Mission Control', shortcut: '^↑', action: () => toggleMissionControl() },
      { sep: true },
      { label: 'Sleep', action: () => system.sleep() },
      { label: 'Restart…', action: () => system.restart() },
      { label: 'Shut Down…', action: () => system.shutdown() },
      { sep: true },
      { label: 'Lock Screen', shortcut: '^⌘Q', action: () => system.lock() },
      { label: 'Log Out…', shortcut: '⇧⌘Q', action: () => system.logOut() },
    ]);
  });

  bar.querySelector('#mb-appname').addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(e.currentTarget, appMenuItems(app || getApp('finder')));
  });

  right.querySelector('#mb-wifi').addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(e.currentTarget, [
      { label: store.get('wifi') ? 'Wi-Fi: On' : 'Wi-Fi: Off', checked: store.get('wifi'), action: () => { store.set('wifi', !store.get('wifi')); sound.play('toggle'); renderMenubar(); } },
      { sep: true },
      { label: 'CanopyNet 5G', checked: store.get('wifi'), disabled: !store.get('wifi'), action: () => {} },
      { label: 'CanopyNet Guest', checked: false, disabled: !store.get('wifi'), action: () => {} },
      { label: 'Neighbor_2.4GHz', checked: false, disabled: !store.get('wifi'), action: () => {} },
      { sep: true },
      { label: 'Network Settings…', action: () => wm.open('settings', { args: { tab: 'network' } }) },
    ], { align: 'right' });
  });

  right.querySelector('#mb-batt').addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(e.currentTarget, [
      { label: `Battery ${Math.round(battery.level * 100)}%${battery.charging ? ' — charging' : ''}`, disabled: true },
      { label: 'Show Percentage', checked: store.get('batteryPct'), action: () => { store.set('batteryPct', !store.get('batteryPct')); renderMenubar(); } },
      { sep: true },
      { label: 'Energy Saver', checked: false, action: () => wm.open('settings', { args: { tab: 'battery' } }) },
      { label: 'Battery Settings…', action: () => wm.open('settings', { args: { tab: 'battery' } }) },
    ], { align: 'right' });
  });

  right.querySelector('#mb-search').addEventListener('click', (e) => { e.stopPropagation(); toggleSpotlight(); });
  right.querySelector('#mb-cc').addEventListener('click', (e) => { e.stopPropagation(); toggleControlCenter(); });
  right.querySelector('#mb-clock').addEventListener('click', (e) => { e.stopPropagation(); toggleNotificationCenter(); });
}

export function initMenubar() {
  renderMenubar();
  setInterval(updateClock, 1000);
  window.addEventListener('canopy:focus', renderMenubar);
  window.addEventListener('canopy:win', (e) => {
    const a = e.detail?.action;
    if (['open', 'close', 'minimize', 'restore', 'blur'].includes(a)) renderMenubar();
  });
  window.addEventListener('canopy:setting', (e) => {
    const k = e.detail?.key || '';
    if (/clock24|showSeconds|showDate|batteryPct|wifi|dnd|userName|accent|theme|fontSize/.test(k)) renderMenubar();
  });
  navigator.getBattery?.().then((b) => {
    battery = b;
    const update = () => { battery = b; renderMenubar(); };
    b.addEventListener('levelchange', update);
    b.addEventListener('chargingchange', update);
    renderMenubar();
  }).catch(() => {});
  // Slow simulated drain when the real battery API is unavailable
  setInterval(() => {
    if (navigator.getBattery) return;
    battery.level = Math.max(0.05, battery.level - 0.0004);
  }, 60000);
}
