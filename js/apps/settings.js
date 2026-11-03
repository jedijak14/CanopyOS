/* CanopyOS — System Settings */
import { store } from '../core/store.js';
import { wm } from '../core/wm.js';
import { fs } from '../core/fs.js';
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { notify } from '../core/notify.js';
import { system } from '../ui/system.js';
import { showShortcuts } from '../ui/shortcuts.js';
import { glyph, appIcon } from '../core/icons.js';
import { formatBytes, storageEstimate, escapeHtml } from '../core/util.js';
import { listCities } from '../core/weather.js';
import { confirmModal, promptModal, alertModal } from '../ui/modal.js';

const ACCENTS = [
  ['#0a84ff', 'Blue'], ['#8e5cf7', 'Purple'], ['#ff375f', 'Pink'], ['#ff453a', 'Red'],
  ['#ff9f0a', 'Orange'], ['#ffd60a', 'Yellow'], ['#30d158', 'Green'], ['#12a37c', 'Canopy'],
  ['#5ac8fa', 'Sky'], ['#64748b', 'Graphite'],
];

const WALLPAPERS = [
  ['canopy', 'Canopy'], ['aurora', 'Aurora'], ['sunset', 'Sunset'], ['ocean', 'Ocean'],
  ['graphite', 'Graphite'], ['bloom', 'Bloom'], ['forest', 'Forest'], ['mono', 'Mono'],
];

const TABS = [
  { group: 'System', id: 'general', label: 'General', icon: 'settings' },
  { group: 'System', id: 'appearance', label: 'Appearance', icon: 'paint' },
  { group: 'System', id: 'wallpaper', label: 'Wallpaper', icon: 'image' },
  { group: 'System', id: 'dock', label: 'Desktop & Dock', icon: 'layers' },
  { group: 'System', id: 'notifications', label: 'Notifications', icon: 'bell' },
  { group: 'System', id: 'sound', label: 'Sound', icon: 'volume' },
  { group: 'Hardware', id: 'network', label: 'Wi-Fi', icon: 'wifi' },
  { group: 'Hardware', id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth' },
  { group: 'Hardware', id: 'battery', label: 'Battery', icon: 'battery' },
  { group: 'Hardware', id: 'keyboard', label: 'Keyboard', icon: 'keyboard' },
  { group: 'Personal', id: 'accessibility', label: 'Accessibility', icon: 'user' },
  { group: 'Personal', id: 'users', label: 'Users & Groups', icon: 'contacts' },
  { group: 'Personal', id: 'storage', label: 'Storage', icon: 'drive' },
  { group: 'Personal', id: 'about', label: 'About', icon: 'info' },
];

const PANE_TITLES = Object.fromEntries(TABS.map((t) => [t.id, t.label]));

function sw(checked, attrs = '') {
  return `<button class="sw-toggle ${checked ? 'on' : ''}" role="switch" aria-checked="${checked}" ${attrs}><span></span></button>`;
}

function row(label, desc, control) {
  return `<div class="set-row"><div class="set-row-text"><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</div><div class="set-row-ctl">${control}</div></div>`;
}

function group(title, inner) {
  return `<div class="set-group"><div class="set-group-title">${title}</div><div class="set-group-body">${inner}</div></div>`;
}

export default {
  id: 'settings',
  name: 'System Settings',
  icon: 'settings',
  colors: ['#9aa6b5', '#4a5563'],
  width: 880, height: 600,
  keywords: ['settings', 'preferences', 'control', 'config', 'theme', 'wallpaper', 'wifi', 'battery', 'users', 'privacy'],
  menus: () => [
    { label: 'View', items: [
      { label: 'Appearance', action: () => window.dispatchEvent(new CustomEvent('canopy:settings-tab', { detail: 'appearance' })) },
      { label: 'Wallpaper', action: () => window.dispatchEvent(new CustomEvent('canopy:settings-tab', { detail: 'wallpaper' })) },
      { label: 'Keyboard Shortcuts', action: () => showShortcuts() },
      { sep: true },
      { label: 'Reset All Settings…', action: () => window.dispatchEvent(new CustomEvent('canopy:settings-reset')) },
    ] },
    { label: 'Window', items: [{ label: 'Minimize', action: () => wm.closeApp('settings') }] },
  ],

  mount({ root, toolbar, win, args }) {
    let tab = args?.tab || 'general';
    let search = '';
    let wallpaperColorA = '#34e0a1';
    let wallpaperColorB = '#0a6e77';

    root.innerHTML = `<div class="settings">
      <aside class="set-side">
        <label class="set-search">${glyph('search', 13, 2)}<input type="search" placeholder="Search settings" data-search aria-label="Search settings" /></label>
        <div class="set-nav"></div>
        <div class="set-user">${glyph('user', 15, 1.8)}<span data-uname>${escapeHtml(store.get('userName'))}</span></div>
      </aside>
      <section class="set-main scroll-thin"><div class="set-pane" data-pane></div></section>
    </div>`;

    const navEl = root.querySelector('.set-nav');
    const paneEl = root.querySelector('[data-pane]');
    const searchEl = root.querySelector('[data-search]');

    function nav() {
      const groups = [...new Set(TABS.map((t) => t.group))];
      navEl.innerHTML = groups.map((g) => `<div class="set-nav-group">${g}</div>${TABS.filter((t) => t.group === g).map((t) => `
        <button class="set-nav-item ${t.id === tab ? 'active' : ''}" data-tab="${t.id}">
          <span class="set-nav-ico">${glyph(t.icon, 14, 1.8)}</span>${t.label}
        </button>`).join('')}`).join('');
      navEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; nav(); pane(); sound.play('click'); }));
    }

    const bindStoreToggle = (selector) => {
      paneEl.querySelectorAll(selector).forEach((el) => el.addEventListener('click', () => {
        const key = el.dataset.t;
        const next = !store.get(key);
        store.set(key, next);
        el.classList.toggle('on', next);
        el.setAttribute('aria-checked', String(next));
        sound.play('toggle');
      }));
    };

    function pane() {
      win.setTitle(search ? 'Settings — Search' : `System Settings — ${PANE_TITLES[tab] || ''}`);
      toolbar.innerHTML = `<span class="fn-toolbar-title">${search ? 'Search Results' : PANE_TITLES[tab] || ''}</span><span class="spacer"></span><span class="tiny muted no-drag">CanopyOS 1.0</span>`;
      if (search) return renderSearch();
      const fn = PANES[tab] || PANES.general;
      paneEl.innerHTML = fn();
      BINDERS[tab]?.();
    }

    function renderSearch() {
      const q = search.toLowerCase();
      const matches = TABS.filter((t) => t.label.toLowerCase().includes(q));
      paneEl.innerHTML = `<h2 class="set-h2">Search Results</h2>
        ${matches.length ? group('Settings', matches.map((m) => `<button class="set-search-hit" data-goto="${m.id}"><span style="width:20px;height:20px">${appIcon(m.icon, ['#94a3b8', '#475569'])}</span>${m.label}</button>`).join('')) : '<div class="empty-state">No settings found</div>'}`;
      paneEl.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.goto; search = ''; searchEl.value = ''; nav(); pane(); }));
    }

    /* ---------------- panes ---------------- */
    const PANES = {
      general: () => `
        <h2 class="set-h2">General</h2>
        <div class="set-hero"><div class="set-hero-ico">${appIcon('canopy', ['#34e0a1', '#0a6e77'])}</div>
          <div><div class="set-hero-name">${escapeHtml(store.get('userName'))}</div><div class="tiny muted">${navigator.platform || 'CanopyOS'} · CanopyOS 1.0</div></div></div>
        ${group('Date & Time', [
          row('24-Hour Time', 'Show time in 24-hour format', sw(store.get('clock24'), 'data-t="clock24"')),
          row('Show Seconds', 'Include seconds in the menu bar clock', sw(store.get('showSeconds'), 'data-t="showSeconds"')),
          row('Show Date', 'Display the date next to the clock', sw(store.get('showDate'), 'data-t="showDate"')),
          row('Time Zone', 'Used for the clock and world clocks', `<select data-sel="timezone">${Intl.supportedValuesOf?.('timeZone')?.slice(0, 40).map((tz) => `<option ${tz === store.get('timezone') ? 'selected' : ''}>${tz}</option>`).join('') || `<option>${store.get('timezone')}</option>`}</select>`),
        ].join(''))}
        ${group('Language & Region', [
          row('Language', 'Interface language', '<select data-sel="language"><option value="en" selected>English (US)</option></select>'),
          row('Temperature', 'Used in Weather and widgets', '<select data-sel="tempUnit"><option>Fahrenheit</option><option>Celsius</option></select>'),
        ].join(''))}
        ${group('Startup', [
          row('Boot Animation', 'Show the startup progress bar', sw(true, 'data-t="bootAnim"')),
          row('Startup Sound', 'Play the chime on boot', sw(store.get('sound'), 'data-t="sound"')),
          row('Auto-Lock', 'Lock the screen after inactivity', `<select data-sel="autoLockMinutes">${[0, 1, 5, 10, 30].map((m) => `<option value="${m}" ${Number(store.get('autoLockMinutes')) === m ? 'selected' : ''}>${m ? m + ' min' : 'Never'}</option>`).join('')}</select>`),
        ].join(''))}
        ${group('Reset', [
          row('Restart', 'Close all windows and start a fresh session', '<button class="btn small" data-act="restart">Restart…</button>'),
          row('Shut Down', 'Power off the session', '<button class="btn small" data-act="shutdown">Shut Down…</button>'),
        ].join(''))}`,

      appearance: () => `
        <h2 class="set-h2">Appearance</h2>
        ${group('Theme', `
          <div class="set-themes">
            ${['light', 'dark', 'auto'].map((t) => `<button class="set-theme-card ${store.get('theme') === t ? 'on' : ''}" data-theme="${t}">
              <span class="set-theme-preview ${t}"></span><span>${t[0].toUpperCase() + t.slice(1)}</span></button>`).join('')}
          </div>`)}
        ${group('Accent Color', `<div class="set-accents">${ACCENTS.map(([hex, name]) => `<button class="set-accent ${store.get('accent') === hex ? 'on' : ''}" data-accent="${hex}" title="${name}" style="background:${hex}"></button>`).join('')}</div>`)}
        ${group('Windows & Text', [
          row('Font Size', `Interface text is ${store.get('fontSize')}px`, `<input type="range" min="11" max="17" step="1" value="${store.get('fontSize')}" data-range="fontSize"><span class="set-val" data-v="fontSize">${store.get('fontSize')}px</span>`),
          row('Corner Radius', `Window corners are ${store.get('cornerRadius')}px`, `<input type="range" min="0" max="22" step="1" value="${store.get('cornerRadius')}" data-range="cornerRadius"><span class="set-val" data-v="cornerRadius">${store.get('cornerRadius')}px</span>`),
          row('Transparency', 'Blur and translucency in menus, dock and windows', sw(store.get('transparency'), 'data-t="transparency"')),
          row('Increase Contrast', 'Stronger borders and text', sw(store.get('contrast') === 'high', 'data-contrast')),
          row('Night Shift', 'Warm the display after sunset', sw(store.get('nightShift'), 'data-t="nightShift"')),
          row('Display Brightness', `${store.get('brightness')}%`, `<input type="range" min="20" max="100" value="${store.get('brightness')}" data-range="brightness"><span class="set-val" data-v="brightness">${store.get('brightness')}%</span>`),
        ].join(''))}`,

      wallpaper: () => `
        <h2 class="set-h2">Wallpaper</h2>
        ${group('Dynamic Wallpapers', `<div class="set-walls">
          ${WALLPAPERS.map(([id, name]) => `<button class="set-wall ${store.get('wallpaper') === id && store.get('wallpaper') !== 'custom' ? 'on' : ''}" data-wall="${id}">
            <span class="wp-${id}"></span><span>${name}</span></button>`).join('')}
        </div>`)}
        ${group('Live Motion', [
          row('Animate Wallpaper', 'Render a moving ambient layer instead of a still background', sw(store.get('wallpaperLive'), 'data-wp-toggle="wallpaperLive"')),
          row('Motion Speed', `${Number(store.get('wallpaperSpeed')).toFixed(1)}×`, `<input type="range" min="0.3" max="1.8" step="0.1" value="${store.get('wallpaperSpeed')}" data-wall-range="wallpaperSpeed"><span class="set-val" data-wall-value="wallpaperSpeed">${Number(store.get('wallpaperSpeed')).toFixed(1)}×</span>`),
          row('Ambient Intensity', `${store.get('wallpaperIntensity')}%`, `<input type="range" min="20" max="100" step="5" value="${store.get('wallpaperIntensity')}" data-wall-range="wallpaperIntensity"><span class="set-val" data-wall-value="wallpaperIntensity">${store.get('wallpaperIntensity')}%</span>`),
          row('Pause When Hidden', 'Stop animation when this tab is in the background', sw(store.get('wallpaperPauseWhenHidden'), 'data-wp-toggle="wallpaperPauseWhenHidden"')),
          row('Time-of-Day Tint', 'Subtle warmth near sunrise and sunset', sw(store.get('wallpaperTimeOfDay'), 'data-wp-toggle="wallpaperTimeOfDay"')),
          row('Low-Power Rendering', 'Reduce particle density and motion work', sw(store.get('wallpaperLowPower'), 'data-wp-toggle="wallpaperLowPower"')),
        ].join(''))}
        ${group('Custom Gradient', `
          <div class="set-custom-wall">
            <div class="set-custom-preview" data-custom-preview style="background:${escapeHtml(store.get('customWallpaper') || `linear-gradient(150deg, ${wallpaperColorA}, ${wallpaperColorB})`)}"></div>
            <div class="set-custom-form">
              <label>Color A <input type="color" data-col="a" value="${wallpaperColorA}"></label>
              <label>Color B <input type="color" data-col="b" value="${wallpaperColorB}"></label>
              <label>Angle <input type="range" min="0" max="360" value="150" data-angle></label>
              <button class="btn small primary" data-act="apply-gradient">Apply Gradient</button>
            </div>
          </div>
          <div class="tiny muted" style="padding:10px 14px">Gradients are pure CSS — no images are downloaded.</div>`)}`,

      dock: () => `
        <h2 class="set-h2">Desktop & Dock</h2>
        ${group('Dock', [
          row('Size', `${store.get('dockSize')}px icons`, `<input type="range" min="38" max="76" value="${store.get('dockSize')}" data-range="dockSize"><span class="set-val" data-v="dockSize">${store.get('dockSize')}px</span>`),
          row('Magnification', 'Enlarge icons as the pointer moves over them', sw(store.get('dockMagnify'), 'data-t="dockMagnify"')),
          row('Automatically Hide', 'Show the Dock only when you move to the edge', sw(store.get('dockAutohide'), 'data-t="dockAutohide"')),
          row('Position on Screen', 'Bottom, left or right', `<div class="set-seg" data-seg="dockPosition">${['bottom', 'left', 'right'].map((p) => `<button data-val="${p}" class="${store.get('dockPosition') === p ? 'on' : ''}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>`),
          row('Bouncing Icons', 'Animate icons when an app launches', sw(true, 'data-t="bounce"')),
        ].join(''))}
        ${group('Desktop', [
          row('Show Widgets', 'Clock, weather, calendar, notes and reminders', sw(store.get('widgets'), 'data-t="widgets"')),
          row('Show Desktop Icons', 'Display files from your Desktop folder', sw(store.get('desktopIcons'), 'data-t="desktopIcons"')),
          row('Widget City', 'Weather location for widgets', `<select data-sel="weatherCity">${listCities().map((c) => `<option ${c.name === data.get('weatherCity') ? 'selected' : ''}>${c.name}</option>`).join('')}</select>`),
        ].join(''))}
        ${group('Spaces', [
          row('Number of Desktops', 'Use Mission Control to add or remove', `<div class="set-stepper"><button data-spaces="-1">−</button><span>${store.get('spaces')}</span><button data-spaces="1">+</button></div>`),
          row('Hot Corners', 'Move the pointer to a corner to trigger an action', `<div class="set-corners">
            ${['hotCornerTL', 'hotCornerBL', 'hotCornerTR', 'hotCornerBR'].map((k) => `<select data-corner="${k}" title="${k.replace('hotCorner', '')}">${[['off', '—'], ['mission', 'Mission Control'], ['launchpad', 'Launchpad'], ['notification', 'Notifications'], ['showdesktop', 'Show Desktop']].map(([v, l]) => `<option value="${v}" ${store.get(k) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`).join('')}
          </div>`),
        ].join(''))}`,

      notifications: () => `
        <h2 class="set-h2">Notifications</h2>
        ${group('Focus', [
          row('Do Not Disturb', 'Silence banners and notification sounds', sw(store.get('dnd'), 'data-t="dnd"')),
          row('Focus Mode', 'Choose what can interrupt you', `<div class="set-seg" data-seg="focusMode">${['off', 'work', 'personal', 'sleep'].map((f) => `<button data-val="${f}" class="${store.get('focusMode') === f ? 'on' : ''}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>`),
        ].join(''))}
        ${group('Notification Center', [
          row('History', `${notify.items().length} notifications stored`, `<button class="btn small" data-act="clear-notifs">Clear All</button>`),
          row('Test Notification', 'Send a sample banner', '<button class="btn small" data-act="test-notif">Send</button>'),
        ].join(''))}
        ${group('Banners', [
          row('Show Banners', 'Display alerts as they arrive', sw(true, 'data-t="banners"')),
          row('Play Sound', 'Play a tone with each banner', sw(store.get('sound'), 'data-t="sound"')),
        ].join(''))}`,

      sound: () => `
        <h2 class="set-h2">Sound</h2>
        ${group('Output', [
          row('Output Volume', `${store.get('volume')}%`, `<input type="range" min="0" max="100" value="${store.get('volume')}" data-range="volume"><span class="set-val" data-v="volume">${store.get('volume')}%</span>`),
          row('Output Device', 'Where sound plays', '<select><option>Canopy Speakers</option><option>Headphones</option><option>Studio Display</option></select>'),
          row('Alert Volume', 'UI sound effects', sw(store.get('sound'), 'data-t="sound"')),
        ].join(''))}
        ${group('Sound Effects', `<div class="set-sounds">${['click', 'pop', 'chime', 'notify', 'success', 'error', 'snap', 'trash'].map((s) => `<button class="btn small" data-sfx="${s}">${s}</button>`).join('')}</div>`)}
        ${group('Music', `<div class="tiny muted" style="padding:8px 0">CanopyOS generates all audio with WebAudio oscillators — there are no audio files in the system.</div>`)}`,

      network: () => `
        <h2 class="set-h2">Wi-Fi</h2>
        ${group('Wi-Fi', [
          row('Wi-Fi', store.get('wifi') ? 'Connected to CanopyNet 5G' : 'Wi-Fi is off', sw(store.get('wifi'), 'data-t="wifi"')),
          row('Ask to Join Networks', 'Prompt before joining known networks', sw(true, 'data-t="askJoin"')),
        ].join(''))}
        ${store.get('wifi') ? group('Networks', [
          ['CanopyNet 5G', 4, 'Connected'], ['CanopyNet Guest', 3, ''], ['Neighbor_2.4GHz', 2, 'Secured'], ['FernCafe-Guest', 2, ''], ['Understory-IoT', 1, 'Secured'],
        ].map(([name, bars, state]) => `<button class="set-net" data-net="${name}">
          <span class="set-net-ico">${glyph('wifi', 16, 1.9)}</span><span class="set-net-name">${name}<small>${state || 'Open network'}</small></span>
          <span class="set-net-bars">${Array.from({ length: 4 }, (_, i) => `<i class="${i < bars ? 'on' : ''}"></i>`).join('')}</span>
          ${state === 'Connected' ? `<span class="set-net-check">${glyph('check', 12, 3)}</span>` : ''}
        </button>`).join('')) : '<div class="empty-state">Wi-Fi is turned off</div>'}
        ${group('Details', [
          row('IP Address', 'Assigned by CanopyNet', '<span class="mono tiny">192.168.1.42</span>'),
          row('Router', 'Gateway address', '<span class="mono tiny">192.168.1.1</span>'),
          row('DNS', 'Resolvers', '<span class="mono tiny">1.1.1.1, 8.8.8.8</span>'),
          row('Hostname', 'Local network name', '<span class="mono tiny">canopy.local</span>'),
        ].join(''))}`,

      bluetooth: () => `
        <h2 class="set-h2">Bluetooth</h2>
        ${group('Bluetooth', [row('Bluetooth', store.get('bluetooth') ? 'On — discoverable' : 'Off', sw(store.get('bluetooth'), 'data-t="bluetooth"'))].join(''))}
        ${group('My Devices', [
          ['Canopy Buds', 'Connected', 100], ['Mossy Keyboard', 'Paired', 78], ['Fern Mouse', 'Paired', 64], ['Trail Speaker', 'Not Connected', 0],
        ].map(([name, state, pct]) => `<div class="set-device"><span class="set-device-ico">${glyph(pct > 0 ? 'headphones' : 'bluetooth', 16, 1.8)}</span>
          <span class="set-device-name">${name}<small>${state}</small></span>
          ${pct ? `<span class="set-batt">${pct}%</span>` : `<button class="btn small">Connect</button>`}</div>`).join(''))}`,

      battery: () => `
        <h2 class="set-h2">Battery</h2>
        ${group('Battery', [
          row('Charge', '87% · 4h 12m remaining', `<div class="set-batt-bar"><span style="width:87%"></span></div>`),
          row('Low Power Mode', 'Reduce background activity', sw(false, 'data-t="lowpower"')),
          row('Optimized Charging', 'Learn your charging routine', sw(true, 'data-t="optcharge"')),
          row('Show Percentage', 'In the menu bar', sw(store.get('batteryPct'), 'data-t="batteryPct"')),
        ].join(''))}
        ${group('Energy', [row('Current Usage', 'Average over the last 24 hours', '<span class="tiny muted">42.1 mAh</span>'), row('Battery Health', 'Maximum capacity', '<span class="tiny">Normal · 96%</span>')].join(''))}
        ${group('Auto-Lock', [row('Lock screen after inactivity', 'Requires your password to unlock', `<select data-sel="autoLockMinutes">${[0, 1, 5, 10, 30].map((m) => `<option value="${m}" ${Number(store.get('autoLockMinutes')) === m ? 'selected' : ''}>${m ? m + ' minutes' : 'Never'}</option>`).join('')}</select>`)].join(''))}`,

      keyboard: () => `
        <h2 class="set-h2">Keyboard</h2>
        ${group('Shortcuts', [row('Keyboard Shortcuts', 'View every shortcut in CanopyOS', '<button class="btn small" data-act="shortcuts">View…</button>')].join(''))}
        ${group('Input', [
          row('Key Repeat', 'Speed when holding a key', '<select><option>Fast</option><option selected>Normal</option><option>Slow</option></select>'),
          row('Text Replacement', 'Expand short snippets as you type', '<button class="btn small" data-act="textrepl">Edit…</button>'),
          row('Dictation', 'Use your microphone to type', sw(false, 'data-t="dictation"')),
        ].join(''))}
        ${group('Emoji', [row('Emoji & Symbols', 'Insert an emoji at the cursor', '<button class="btn small" data-act="emoji">Open Picker</button>')].join(''))}`,

      accessibility: () => `
        <h2 class="set-h2">Accessibility</h2>
        ${group('Motion & Display', [
          row('Reduce Motion', 'Disable animations', sw(store.get('reduceMotion'), 'data-t="reduceMotion"')),
          row('Increase Contrast', 'Darker borders, higher contrast text', sw(store.get('contrast') === 'high', 'data-contrast')),
          row('Reduce Transparency', 'Solid backgrounds instead of blur', sw(!store.get('transparency'), 'data-notransparency')),
          row('Larger Text', 'Increase the interface font size', `<input type="range" min="11" max="17" step="1" value="${store.get('fontSize')}" data-range="fontSize"><span class="set-val" data-v="fontSize">${store.get('fontSize')}px</span>`),
        ].join(''))}
        ${group('Pointer & Keyboard', [
          row('Pointer Size', 'Make the cursor easier to locate', `<div class="set-seg" data-seg="cursorSize">${['normal', 'large'].map((v) => `<button data-val="${v}" class="${store.get('cursorSize', 'normal') === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>`),
          row('Full Keyboard Access', 'Tab through every control', sw(false, 'data-t="fullkbd"')),
        ].join(''))}
        ${group('Hearing', [row('Mono Audio', 'Combine stereo channels', sw(false, 'data-t="mono"')), row('Flash Screen for Alerts', 'Visual notification cue', sw(false, 'data-t="flash"'))].join(''))}`,

      users: () => `
        <h2 class="set-h2">Users & Groups</h2>
        ${group('Account', [
          row('Full Name', 'Shown on the lock screen and menu bar', `<input type="text" data-text="userName" value="${escapeHtml(store.get('userName'))}" />`),
          row('Avatar Initial', 'A single letter', `<input type="text" maxlength="1" style="width:48px;text-align:center" data-text="avatarInitial" value="${escapeHtml(store.get('avatarInitial'))}" />`),
        ].join(''))}
        ${group('Login', [
          row('Require Password', 'Ask for a password when unlocking', sw(store.get('requirePassword'), 'data-t="requirePassword"')),
          row('Password', store.get('lockPassword') ? 'Password is set' : 'No password set', '<button class="btn small" data-act="setpass">Change…</button>'),
          row('Lock Now', 'Lock the screen immediately', '<button class="btn small" data-act="lock">Lock</button>'),
        ].join(''))}
        ${group('Guest User', [row('Allow Guest Login', 'A temporary session with no saved data', sw(store.get('guestMode'), 'data-t="guestMode"'))].join(''))}
        ${group('Danger Zone', [
          row('Reset Settings', 'Restore every preference to its default', '<button class="btn small danger" data-act="reset-settings">Reset</button>'),
          row('Erase File System', 'Delete all files and restore the demo documents', '<button class="btn small danger" data-act="reset-fs">Erase…</button>'),
        ].join(''))}`,

      storage: () => {
        const stats = fs.stats();
        const used = storageEstimate();
        const pct = Math.min(100, (used / (5 * 1024 * 1024)) * 100);
        return `<h2 class="set-h2">Storage</h2>
        ${group('Canopy Drive', `<div class="set-storage-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
          <div class="tiny muted" style="margin-top:8px">${formatBytes(used)} used of 5 MB browser quota · ${stats.files} files, ${stats.folders} folders</div>`)}
        ${group('By Category', [
          ['Documents', stats.files * 1400, '#0a84ff'], ['Notes & Data', JSON.stringify(data.data).length, '#34c759'], ['Settings', JSON.stringify(store.all()).length, '#ff9f0a'], ['Trash', (fs.stat('/Trash')?.children.length || 0) * 900, '#ff453a'],
        ].map(([label, bytes, color]) => `<div class="set-cat-row"><span class="set-cat-dot" style="background:${color}"></span><span>${label}</span><span class="spacer"></span><span class="tiny muted">${formatBytes(bytes)}</span></div>`).join(''))}
        ${group('Maintenance', [row('Empty Trash', 'Permanently remove deleted files', '<button class="btn small" data-act="empty-trash">Empty</button>'), row('Clear Notification History', 'Free up a little space', '<button class="btn small" data-act="clear-notifs">Clear</button>')].join(''))}`;
      },

      about: () => {
        const ua = navigator.userAgent;
        const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
        return `<h2 class="set-h2">About</h2>
        <div class="set-about">
          <div class="set-about-logo">${appIcon('canopy', ['#34e0a1', '#0a6e77'])}</div>
          <div class="set-about-name">CanopyOS</div>
          <div class="tiny muted">Version 1.0 "Understory"</div>
          <div class="tiny muted" style="margin-top:4px">Open source · public domain</div>
        </div>
        ${group('System', [
          ['User', store.get('userName')], ['Browser', browser], ['Display', `${window.innerWidth} × ${window.innerHeight} @ ${window.devicePixelRatio || 1}x`],
          ['Cores', String(navigator.hardwareConcurrency || 4)], ['Memory', `${navigator.deviceMemory || 8} GB`], ['Storage', formatBytes(storageEstimate())],
          ['Timezone', store.get('timezone')], ['Uptime', `${Math.floor(performance.now() / 60000)} minutes`],
        ].map(([k, v]) => row(k, '', `<span class="tiny muted">${escapeHtml(v)}</span>`)).join(''))}
        ${group('Credits', `<div class="tiny" style="line-height:1.7;padding:4px 0">Designed and built by the CanopyOS contributors. Every icon, wallpaper, sound and line of interface code is original work released into the public domain. No Apple assets are used anywhere in this project.</div>`)}
        ${group('Maintenance', [row('Restart', 'Reload the session', '<button class="btn small" data-act="restart">Restart…</button>'), row('Shut Down', 'Power off', '<button class="btn small" data-act="shutdown">Shut Down…</button>')].join(''))}`;
      },
    };

    /* ---------------- binders ---------------- */
    const BINDERS = {
      general: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-sel]').forEach((sel) => sel.addEventListener('change', () => {
          const key = sel.dataset.sel;
          if (key === 'autoLockMinutes') store.set('autoLockMinutes', Number(sel.value));
          else if (key === 'timezone') store.set('timezone', sel.value);
          else data.set('weatherCity', sel.value);
        }));
        paneEl.querySelector('[data-act="restart"]')?.addEventListener('click', () => system.restart());
        paneEl.querySelector('[data-act="shutdown"]')?.addEventListener('click', () => system.shutdown());
      },
      appearance: () => {
        paneEl.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
          store.set('theme', b.dataset.theme);
          paneEl.querySelectorAll('[data-theme]').forEach((x) => x.classList.toggle('on', x === b));
          sound.play('click');
        }));
        paneEl.querySelectorAll('[data-accent]').forEach((b) => b.addEventListener('click', () => {
          store.set('accent', b.dataset.accent);
          paneEl.querySelectorAll('[data-accent]').forEach((x) => x.classList.toggle('on', x === b));
          sound.play('click');
        }));
        paneEl.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => {
          const key = r.dataset.range;
          const v = Number(r.value);
          store.set(key, v);
          const out = paneEl.querySelector(`[data-v="${key}"]`);
          if (out) out.textContent = key === 'fontSize' || key === 'cornerRadius' ? `${v}px` : `${v}%`;
          if (key === 'brightness') document.documentElement.style.setProperty('--brightness', String(v / 100));
        }));
        bindStoreToggle('[data-t]');
        paneEl.querySelector('[data-contrast]')?.addEventListener('click', (e) => {
          store.set('contrast', store.get('contrast') === 'high' ? 'normal' : 'high');
          e.currentTarget.classList.toggle('on', store.get('contrast') === 'high');
        });
      },
      wallpaper: () => {
        paneEl.querySelectorAll('[data-wp-toggle]').forEach((b) => b.addEventListener('click', () => {
          const key = b.dataset.wpToggle;
          store.set(key, !store.get(key));
          const on = store.get(key);
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
          sound.play('toggle');
        }));
        paneEl.querySelectorAll('[data-wall-range]').forEach((r) => r.addEventListener('input', () => {
          const key = r.dataset.wallRange;
          const value = Number(r.value);
          store.set(key, value);
          const out = paneEl.querySelector(`[data-wall-value="${key}"]`);
          if (out) out.textContent = key === 'wallpaperSpeed' ? `${value.toFixed(1)}×` : `${value}%`;
        }));
        paneEl.querySelectorAll('[data-wall]').forEach((b) => b.addEventListener('click', () => {
          store.set('wallpaper', b.dataset.wall);
          paneEl.querySelectorAll('[data-wall]').forEach((x) => x.classList.toggle('on', x === b));
          sound.play('pop');
        }));
        const updatePreview = () => {
          const a = paneEl.querySelector('[data-col="a"]').value;
          const b = paneEl.querySelector('[data-col="b"]').value;
          wallpaperColorA = a; wallpaperColorB = b;
          const angle = paneEl.querySelector('[data-angle]').value;
          paneEl.querySelector('[data-custom-preview]').style.background = `linear-gradient(${angle}deg, ${a}, ${b})`;
        };
        paneEl.querySelectorAll('[data-col]').forEach((i) => i.addEventListener('input', updatePreview));
        paneEl.querySelector('[data-angle]')?.addEventListener('input', updatePreview);
        paneEl.querySelector('[data-act="apply-gradient"]')?.addEventListener('click', () => {
          const angle = paneEl.querySelector('[data-angle]').value;
          store.set('customWallpaper', `linear-gradient(${angle}deg, ${wallpaperColorA}, ${wallpaperColorB})`);
          store.set('wallpaper', 'custom');
          sound.play('success');
          notify.post({ title: 'Wallpaper updated', body: 'Your custom gradient is now the desktop background.', app: 'System Settings', appId: 'settings', icon: 'image', colors: ['#7be0c0', '#2f9e7a'] });
        });
      },
      dock: () => {
        paneEl.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => {
          const key = r.dataset.range;
          store.set(key, Number(r.value));
          const out = paneEl.querySelector(`[data-v="${key}"]`);
          if (out) out.textContent = `${r.value}px`;
        }));
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
          store.set(seg.dataset.seg, b.dataset.val);
          seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        })));
        paneEl.querySelectorAll('[data-sel]').forEach((s) => s.addEventListener('change', () => data.set('weatherCity', s.value)));
        paneEl.querySelectorAll('[data-corner]').forEach((s) => s.addEventListener('change', () => store.set(s.dataset.corner, s.value)));
        paneEl.querySelectorAll('[data-spaces]').forEach((b) => b.addEventListener('click', () => {
          const delta = Number(b.dataset.spaces);
          const n = Math.max(1, Math.min(6, store.get('spaces') + delta));
          store.set('spaces', n);
          if (n !== wm.spaces) { wm.spaces = n; wm.setSpace(Math.min(wm.currentSpace, n - 1)); }
          pane();
        }));
      },
      notifications: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
          store.set('focusMode', b.dataset.val);
          store.set('dnd', b.dataset.val !== 'off');
          seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        })));
        paneEl.querySelector('[data-act="clear-notifs"]')?.addEventListener('click', () => { notify.clear(); pane(); });
        paneEl.querySelector('[data-act="test-notif"]')?.addEventListener('click', () => notify.post({
          title: 'Test notification', body: 'This is what a CanopyOS alert looks like.', app: 'System Settings', appId: 'settings', icon: 'bell', colors: ['#64748b', '#1e293b'],
        }));
      },
      sound: () => {
        paneEl.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => {
          const v = Number(r.value);
          store.set('volume', v);
          paneEl.querySelector('[data-v="volume"]').textContent = `${v}%`;
        }));
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-sfx]').forEach((b) => b.addEventListener('click', () => sound.play(b.dataset.sfx)));
      },
      network: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-net]').forEach((b) => b.addEventListener('click', () => {
          notify.post({ title: 'Wi-Fi', body: `Connecting to ${b.dataset.net}…`, app: 'System Settings', silent: false, icon: 'wifi', colors: ['#38bdf8', '#0369a1'], appId: 'settings' });
          setTimeout(() => notify.post({ title: 'Wi-Fi', body: `Connected to ${b.dataset.net}.`, app: 'System Settings', icon: 'wifi', colors: ['#38bdf8', '#0369a1'], appId: 'settings' }), 1200);
        }));
      },
      bluetooth: () => { bindStoreToggle('[data-t]'); },
      battery: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-sel]').forEach((s) => s.addEventListener('change', () => store.set('autoLockMinutes', Number(s.value))));
      },
      keyboard: () => {
        paneEl.querySelector('[data-act="shortcuts"]')?.addEventListener('click', () => showShortcuts());
        paneEl.querySelector('[data-act="emoji"]')?.addEventListener('click', () => import('../ui/emojipicker.js').then((m) => m.toggleEmojiPicker()));
        paneEl.querySelector('[data-act="textrepl"]')?.addEventListener('click', () => alertModal({ title: 'Text Replacement', body: 'No replacements yet. This would expand short snippets as you type.', art: 'keyboard' }));
      },
      accessibility: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelector('[data-contrast]')?.addEventListener('click', (e) => {
          store.set('contrast', store.get('contrast') === 'high' ? 'normal' : 'high');
          e.currentTarget.classList.toggle('on', store.get('contrast') === 'high');
        });
        paneEl.querySelector('[data-notransparency]')?.addEventListener('click', (e) => {
          store.set('transparency', !store.get('transparency'));
          e.currentTarget.classList.toggle('on', !store.get('transparency'));
        });
        paneEl.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => {
          store.set('fontSize', Number(r.value));
          paneEl.querySelector('[data-v="fontSize"]').textContent = `${r.value}px`;
        }));
        paneEl.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
          store.set('cursorSize', b.dataset.val);
          document.documentElement.dataset.cursor = b.dataset.val;
          seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        })));
      },
      users: () => {
        bindStoreToggle('[data-t]');
        paneEl.querySelectorAll('[data-text]').forEach((i) => i.addEventListener('change', () => {
          store.set(i.dataset.text, i.value.slice(0, i.dataset.text === 'avatarInitial' ? 1 : 40));
          root.querySelector('[data-uname]').textContent = store.get('userName');
        }));
        paneEl.querySelector('[data-act="setpass"]')?.addEventListener('click', async () => {
          const pass = await promptModal({ title: 'Set Password', label: 'Leave blank for no password', value: store.get('lockPassword'), okLabel: 'Save' });
          if (pass === null) return;
          store.set('lockPassword', pass);
          store.set('requirePassword', !!pass);
          pane();
        });
        paneEl.querySelector('[data-act="lock"]')?.addEventListener('click', () => system.lock());
        paneEl.querySelector('[data-act="reset-settings"]')?.addEventListener('click', async () => {
          const ok = await confirmModal({ title: 'Reset all settings?', body: 'Every preference returns to its default value. Files are not affected.', okLabel: 'Reset Settings' });
          if (ok) { store.reset(); pane(); notify.post({ title: 'Settings reset', body: 'All preferences restored to defaults.', icon: 'settings' }); }
        });
        paneEl.querySelector('[data-act="reset-fs"]')?.addEventListener('click', async () => {
          const ok = await confirmModal({ title: 'Erase the file system?', body: 'All files will be deleted and the original demo documents restored. This cannot be undone.', okLabel: 'Erase' });
          if (ok) { fs.reset(); data.reset(); notify.post({ title: 'File system erased', body: 'Canopy Drive has been restored to its original state.', icon: 'trash' }); }
        });
      },
      storage: () => {
        paneEl.querySelector('[data-act="empty-trash"]')?.addEventListener('click', () => { fs.emptyTrash(); sound.play('trash'); pane(); });
        paneEl.querySelector('[data-act="clear-notifs"]')?.addEventListener('click', () => { notify.clear(); pane(); });
      },
      about: () => {
        paneEl.querySelector('[data-act="restart"]')?.addEventListener('click', () => system.restart());
        paneEl.querySelector('[data-act="shutdown"]')?.addEventListener('click', () => system.shutdown());
      },
    };

    searchEl.addEventListener('input', () => { search = searchEl.value; pane(); });

    const tabHandler = (e) => { tab = e.detail; nav(); pane(); };
    const resetHandler = () => window.dispatchEvent(new CustomEvent('canopy:settings-reset'));
    window.addEventListener('canopy:settings-tab', tabHandler);
    win.onClose(() => window.removeEventListener('canopy:settings-tab', tabHandler));

    nav();
    pane();
  },
};
