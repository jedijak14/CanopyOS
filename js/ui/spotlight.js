/* CanopyOS — Spotlight: apps, files, settings, math, conversions, actions */
import { allApps, wm } from '../core/wm.js';
import { fs } from '../core/fs.js';
import { data } from '../core/data.js';
import { glyph, appIcon, fileIcon, iconColor } from '../core/icons.js';
import { openPath } from '../core/open.js';
import { sound } from '../core/sound.js';
import { fmtDate, escapeHtml, copyText } from '../core/util.js';
import { system } from './system.js';
import { listCities, clockInZone } from '../core/weather.js';

const SETTINGS_INDEX = [
  { label: 'Dark Mode', sub: 'Appearance', tab: 'appearance', icon: 'moon' },
  { label: 'Wallpaper', sub: 'Appearance', tab: 'wallpaper', icon: 'image' },
  { label: 'Accent Color', sub: 'Appearance', tab: 'appearance', icon: 'paint' },
  { label: 'Dock Size & Magnification', sub: 'Desktop & Dock', tab: 'dock', icon: 'layers' },
  { label: 'Menu Bar Clock', sub: 'Control Center', tab: 'general', icon: 'clockSmall' },
  { label: 'Notifications & Focus', sub: 'Notifications', tab: 'notifications', icon: 'bell' },
  { label: 'Sound & Volume', sub: 'Sound', tab: 'sound', icon: 'volume' },
  { label: 'Wi-Fi', sub: 'Network', tab: 'network', icon: 'wifi' },
  { label: 'Bluetooth', sub: 'Bluetooth', tab: 'bluetooth', icon: 'bluetooth' },
  { label: 'Battery', sub: 'Battery', tab: 'battery', icon: 'battery' },
  { label: 'Accessibility', sub: 'Reduce motion, contrast', tab: 'accessibility', icon: 'user' },
  { label: 'Keyboard Shortcuts', sub: 'Keyboard', tab: 'keyboard', icon: 'keyboard' },
  { label: 'Users & Groups', sub: 'Users', tab: 'users', icon: 'user' },
  { label: 'Storage', sub: 'General', tab: 'storage', icon: 'drive' },
  { label: 'About This Canopy', sub: 'General', tab: 'about', icon: 'info' },
  { label: 'Night Shift', sub: 'Display', tab: 'appearance', icon: 'brightness' },
  { label: 'Do Not Disturb', sub: 'Focus', tab: 'notifications', icon: 'bell' },
];

const UNITS = {
  // length (meters)
  mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344,
  // mass (kg)
  mg: 1e-6, g: 0.001, kg: 1, oz: 0.0283495, lb: 0.453592, st: 6.35029, ton: 1000,
  // volume (liters)
  ml: 0.001, l: 1, cup: 0.236588, pt: 0.473176, qt: 0.946353, gal: 3.78541,
  // data (bytes)
  b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776,
  // speed (m/s)
  mph: 0.44704, kph: 0.277778, knot: 0.514444,
  // time (seconds)
  s: 1, min: 60, h: 3600, day: 86400, week: 604800,
  // currency (relative to USD, simulated)
  usd: 1, eur: 1.09, gbp: 1.27, jpy: 0.0067, cad: 0.73, aud: 0.66, chf: 1.12, inr: 0.012,
};
const UNIT_LABELS = {
  mm: 'millimeters', cm: 'centimeters', m: 'meters', km: 'kilometers', in: 'inches', ft: 'feet', yd: 'yards', mi: 'miles',
  mg: 'milligrams', g: 'grams', kg: 'kilograms', oz: 'ounces', lb: 'pounds', st: 'stone', ton: 'tonnes',
  ml: 'milliliters', l: 'liters', cup: 'cups', pt: 'pints', qt: 'quarts', gal: 'gallons',
  b: 'bytes', kb: 'kilobytes', mb: 'megabytes', gb: 'gigabytes', tb: 'terabytes',
  mph: 'miles per hour', kph: 'kilometers per hour', knot: 'knots',
  s: 'seconds', min: 'minutes', h: 'hours', day: 'days', week: 'weeks',
  usd: 'US dollars', eur: 'euros', gbp: 'pounds sterling', jpy: 'yen', cad: 'Canadian dollars', aud: 'Australian dollars', chf: 'francs', inr: 'rupees',
};

const state = { q: '', results: [], index: 0, answer: null };

function tryMath(q) {
  const raw = q.trim().replace(/^=\s*/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const percentOf = raw.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/i);
  if (percentOf) return { display: String((Number(percentOf[1]) / 100) * Number(percentOf[2])), sub: `${percentOf[1]}% of ${percentOf[2]}` };

  const temp = raw.match(/^(-?[\d.]+)\s*(c|f|°c|°f)\s*(?:to|in)\s*(c|f|°c|°f)$/i);
  if (temp) {
    const v = Number(temp[1]);
    const from = temp[2].replace('°', '').toLowerCase();
    const to = temp[3].replace('°', '').toLowerCase();
    const c = from === 'c' ? v : (v - 32) * (5 / 9);
    const out = to === 'c' ? c : c * (9 / 5) + 32;
    return { display: `${Number(out.toFixed(2))}°${to.toUpperCase()}`, sub: `${v}°${from.toUpperCase()} converted` };
  }

  const conv = raw.match(/^([\d.]+)\s*([a-z]+)\s*(?:to|in)\s*([a-z]+)$/i);
  if (conv) {
    const [, num, from, to] = conv;
    const f = from.toLowerCase(); const t = to.toLowerCase();
    if (UNITS[f] && UNITS[t]) {
      const out = (Number(num) * UNITS[f]) / UNITS[t];
      return { display: `${Number(out.toFixed(4)).toLocaleString('en-US')} ${t}`, sub: `${num} ${UNIT_LABELS[f] || f} → ${UNIT_LABELS[t] || t}` };
    }
  }

  if (!/^[\d\s.+\-*/^()%eE]+$/.test(raw)) return null;
  if (!/[\d]/.test(raw) || !/[+\-*/^%]/.test(raw)) return null;
  try {
    const expr = raw.replace(/\^/g, '**').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict";return (${expr})`)();
    if (typeof val !== 'number' || !isFinite(val)) return null;
    const rounded = Math.abs(val % 1) < 1e-9 ? String(val) : String(Number(val.toFixed(6)));
    return { display: rounded, sub: `${raw}  ·  press ⏎ to copy`, copy: rounded };
  } catch (e) { return null; }
}

function tryTime(q) {
  const m = q.match(/(?:time|clock)\s+in\s+([a-z\s]+)/i);
  if (!m) return null;
  const cityName = m[1].trim().toLowerCase();
  const city = listCities().find((c) => c.name.toLowerCase() === cityName);
  if (!city) return null;
  return { display: clockInZone(city.tz), sub: `${city.name}, ${city.country} · ${fmtDate(new Date())}` };
}

function buildResults(q) {
  const out = [];
  const lower = q.toLowerCase().trim();
  if (!lower) {
    out.push({ section: 'Suggestions' });
    ['finder', 'terminal', 'notes', 'mail', 'photos', 'settings'].forEach((id) => {
      const app = allApps().find((a) => a.id === id);
      if (app) out.push({ type: 'app', id, name: app.name, sub: 'Application', art: appIcon(app.icon, app.colors) });
    });
    const recent = data.get('recentFiles', []);
    if (recent.length) {
      out.push({ section: 'Recent' });
      recent.slice(0, 4).forEach((p) => {
        const node = fs.stat(p);
        if (node) out.push({ type: 'file', path: p, name: node.name, sub: p.replace(/\/[^/]+$/, ''), art: fileIcon(node) });
      });
    }
    return out;
  }

  const apps = allApps()
    .filter((a) => a.name.toLowerCase().includes(lower) || (a.keywords || []).some((k) => k.includes(lower)) || a.id.includes(lower))
    .slice(0, 5);
  if (apps.length) {
    out.push({ section: 'Applications' });
    apps.forEach((a) => out.push({ type: 'app', id: a.id, name: a.name, sub: 'Application', art: appIcon(a.icon, a.colors) }));
  }

  const files = fs.search(q).filter((f) => !f.path.startsWith('/Trash')).slice(0, 6);
  if (files.length) {
    out.push({ section: 'Files' });
    files.forEach((f) => out.push({ type: 'file', path: f.path, name: f.node.name, sub: f.path.replace(/\/[^/]+$/, '') || '/', art: fileIcon(f.node) }));
  }

  const settings = SETTINGS_INDEX.filter((s) => s.label.toLowerCase().includes(lower) || s.sub.toLowerCase().includes(lower)).slice(0, 4);
  if (settings.length) {
    out.push({ section: 'System Settings' });
    settings.forEach((s) => out.push({ type: 'setting', tab: s.tab, name: s.label, sub: `System Settings · ${s.sub}`, art: appIcon(s.icon, iconColor(s.label)) }));
  }

  const contacts = data.get('contacts', []).filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 3);
  if (contacts.length) {
    out.push({ section: 'Contacts' });
    contacts.forEach((c) => out.push({ type: 'contact', name: c.name, sub: c.email || c.phone || 'Contact', art: appIcon('user', [c.color, '#1f2937']) }));
  }

  const notes = data.get('notes', []).filter((n) => n.title.toLowerCase().includes(lower) || n.body.toLowerCase().includes(lower)).slice(0, 3);
  if (notes.length) {
    out.push({ section: 'Notes' });
    notes.forEach((n) => out.push({ type: 'note', id: n.id, name: n.title, sub: 'Note · ' + n.folder, art: appIcon('notes', ['#fbbf24', '#b45309']) }));
  }

  const actions = [
    { match: /lock|lock screen/, name: 'Lock Screen', run: () => system.lock(), icon: 'lock' },
    { match: /sleep/, name: 'Sleep', run: () => system.sleep(), icon: 'moon' },
    { match: /restart|reboot/, name: 'Restart', run: () => system.restart(), icon: 'refresh' },
    { match: /shut down|shutdown|power off/, name: 'Shut Down', run: () => system.shutdown(), icon: 'power' },
    { match: /empty trash/, name: 'Empty Trash', run: () => { fs.emptyTrash(); sound.play('trash'); }, icon: 'trash' },
    { match: /mission control/, name: 'Mission Control', run: () => import('./missioncontrol.js').then((m) => m.toggleMissionControl()), icon: 'layers' },
    { match: /launchpad/, name: 'Launchpad', run: () => import('./launchpad.js').then((m) => m.toggleLaunchpad()), icon: 'grid' },
    { match: /screenshot/, name: 'Take Screenshot', run: () => wm.open('screenshot'), icon: 'screenshot' },
    { match: /wallpaper/, name: 'Change Wallpaper', run: () => wm.open('settings', { args: { tab: 'wallpaper' } }), icon: 'image' },
    { match: /new note/, name: 'New Note', run: () => wm.open('notes', { args: { new: true } }), icon: 'notes' },
    { match: /terminal|shell|command/, name: 'Open Terminal', run: () => wm.open('terminal'), icon: 'terminal' },
  ].filter((a) => a.match.test(lower));
  if (actions.length) {
    out.push({ section: 'Actions' });
    actions.slice(0, 4).forEach((a) => out.push({ type: 'action', name: a.name, sub: 'Action', run: a.run, art: appIcon(a.icon, ['#64748b', '#1e293b']) }));
  }

  if (q.trim().length > 2) {
    out.push({ section: 'Web' });
    out.push({ type: 'web', name: `Search the web for "${q.trim()}"`, sub: 'Opens Canopy Browser', query: q.trim(), art: appIcon('browser', ['#38bdf8', '#0369a1']) });
  }
  return out;
}

function rowHTML(r, i) {
  if (r.section) return `<div class="spot-section">${escapeHtml(r.section)}</div>`;
  return `<button class="spot-row ${i === state.index ? 'sel' : ''}" data-i="${i}">
    <span class="spot-art">${r.art || ''}</span>
    <span class="spot-main"><span class="spot-name">${escapeHtml(r.name || '')}</span><span class="spot-sub">${escapeHtml(r.sub || '')}</span></span>
    ${r.type === 'setting' ? `<span class="spot-kind">Settings</span>` : r.type === 'file' ? `<span class="spot-kind">Open</span>` : ''}
  </button>`;
}

function render() {
  const c = document.getElementById('spotlight');
  if (!c) return;
  const items = state.results.filter((r) => !r.section);
  const answer = state.answer;
  c.innerHTML = `<div class="spot" role="dialog" aria-label="Spotlight search">
    <div class="spot-input">${glyph('search', 21, 2)}<input type="text" id="spot-input" placeholder="Canopy Search" autocomplete="off" spellcheck="false" value="${escapeHtml(state.q)}" aria-label="Search" /><kbd>esc</kbd></div>
    <div class="spot-results" id="spot-results">
      ${answer ? `<div class="spot-answer"><div class="sa-big">${escapeHtml(answer.display)}</div><div class="sa-small">${escapeHtml(answer.sub || '')}</div></div>` : ''}
      ${items.length ? state.results.map((r) => rowHTML(r, state.results.indexOf(r))).join('') : `<div class="spot-empty">No results for "${escapeHtml(state.q)}"</div>`}
    </div>
    <div class="spot-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>⏎</kbd> open</span><span><kbd>⌘K</kbd> toggle</span><span class="spacer"></span><span>${items.length} result${items.length === 1 ? '' : 's'}</span></div>
  </div>`;

  const input = c.querySelector('#spot-input');
  input.value = state.q;
  input.addEventListener('input', () => {
    state.q = input.value;
    state.answer = tryMath(state.q) || tryTime(state.q);
    state.results = buildResults(state.q);
    state.index = state.results.findIndex((r) => !r.section);
    if (state.index < 0) state.index = 0;
    renderResultsOnly();
  });
  input.addEventListener('keydown', onKey);
  input.focus();
  const len = input.value.length;
  input.setSelectionRange(len, len);
  bindRows();
}

function renderResultsOnly() {
  const res = document.getElementById('spot-results');
  if (!res) return;
  const answer = state.answer;
  const items = state.results.filter((r) => !r.section);
  res.innerHTML = `${answer ? `<div class="spot-answer"><div class="sa-big">${escapeHtml(answer.display)}</div><div class="sa-small">${escapeHtml(answer.sub || '')}</div></div>` : ''}
    ${items.length ? state.results.map((r) => rowHTML(r, state.results.indexOf(r))).join('') : `<div class="spot-empty">No results for "${escapeHtml(state.q)}"</div>`}`;
  bindRows();
  res.querySelector('.spot-row.sel')?.scrollIntoView({ block: 'nearest' });
}

function bindRows() {
  document.querySelectorAll('#spotlight .spot-row').forEach((row) => {
    row.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      state.index = Number(row.dataset.i);
      activate();
    });
  });
}

function onKey(e) {
  const items = state.results.map((r, i) => (r.section ? null : i)).filter((i) => i !== null);
  const pos = items.indexOf(state.index);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.index = items[(pos + 1) % items.length] ?? state.index;
    renderResultsOnly();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.index = items[(pos - 1 + items.length) % items.length] ?? state.index;
    renderResultsOnly();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activate();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeSpotlight();
  }
}

function activate() {
  const r = state.results[state.index];
  if (!r) {
    if (state.answer?.copy) copyText(state.answer.copy);
    return;
  }
  closeSpotlight();
  setTimeout(() => {
    if (r.type === 'app') wm.open(r.id);
    else if (r.type === 'file') openPath(r.path);
    else if (r.type === 'setting') wm.open('settings', { args: { tab: r.tab } });
    else if (r.type === 'contact') wm.open('contacts', { args: { id: r.name } });
    else if (r.type === 'note') wm.open('notes', { args: { id: r.id } });
    else if (r.type === 'action') r.run?.();
    else if (r.type === 'web') wm.open('browser', { args: { query: r.query } });
  }, 60);
}

let isOpen = false;

export function openSpotlight() {
  const c = document.getElementById('spotlight');
  if (!c || isOpen) return;
  isOpen = true;
  state.q = '';
  state.answer = null;
  state.results = buildResults('');
  state.index = state.results.findIndex((r) => !r.section);
  if (state.index < 0) state.index = 0;
  c.hidden = false;
  render();
}

export function closeSpotlight() {
  const c = document.getElementById('spotlight');
  if (!c || !isOpen) return;
  isOpen = false;
  c.hidden = true;
  c.innerHTML = '';
  state.q = '';
}

export function toggleSpotlight() {
  if (isOpen) closeSpotlight();
  else openSpotlight();
}

document.addEventListener('pointerdown', (e) => {
  if (!isOpen) return;
  if (e.target.closest('.spot')) return;
  closeSpotlight();
}, true);
