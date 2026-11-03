/* CanopyOS — Control Center */
import { glyph } from '../core/icons.js';
import { store } from '../core/store.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { media, fmtDuration } from '../core/media.js';
import { alertModal } from './modal.js';

const el = () => document.getElementById('control-center');
let open = false;

function toggleHTML(key, icon, label, sub, isOn) {
  return `<button class="cc-toggle ${isOn ? 'on' : ''}" data-cc="${key}">
    <span class="cc-ico">${glyph(icon, 15, 1.9)}</span>
    <span class="cc-txt"><b>${label}</b><small>${sub}</small></span>
  </button>`;
}

function render() {
  const c = el();
  if (!c) return;
  const wifi = store.get('wifi');
  const bt = store.get('bluetooth');
  const air = store.get('airdrop');
  const dark = store.effectiveTheme() === 'dark';
  const focus = store.get('focusMode');
  const track = media.get().track;
  const m = media.get();

  c.innerHTML = `
    <div class="cc-card">
      ${toggleHTML('wifi', 'wifi', 'Wi-Fi', wifi ? 'CanopyNet 5G' : 'Off', wifi)}
      ${toggleHTML('bluetooth', 'bluetooth', 'Bluetooth', bt ? 'On' : 'Off', bt)}
      ${toggleHTML('airdrop', 'airdrop', 'AirDrop', air ? 'Contacts Only' : 'Off', air)}
    </div>
    <div class="cc-card">
      ${toggleHTML('focus', 'moon', 'Focus', focus === 'off' ? 'Off' : focus, focus !== 'off')}
      ${toggleHTML('dark', 'sun', 'Appearance', dark ? 'Dark' : 'Light', dark)}
      ${toggleHTML('nightsight', 'brightness', 'Night Shift', store.get('nightShift') ? 'On' : 'Off', store.get('nightShift'))}
    </div>
    <div class="cc-card wide">
      <div class="cc-title">Display</div>
      <div class="cc-slider">${glyph('brightness', 15)}<input type="range" min="20" max="100" value="${store.get('brightness')}" data-cc-range="brightness" aria-label="Brightness"></div>
      <div class="cc-mini">
        <button class="cc-chip ${store.get('stageManager') ? 'on' : ''}" data-cc="stage">${glyph('layers', 13)} Stage Manager</button>
        <button class="cc-chip" data-cc="mirror">${glyph('cast', 13)} Mirror</button>
      </div>
    </div>
    <div class="cc-card wide">
      <div class="cc-title">Sound <span>${store.get('volume')}%</span></div>
      <div class="cc-slider">${glyph(store.get('volume') ? 'volume' : 'volumeMute', 15)}<input type="range" min="0" max="100" value="${store.get('volume')}" data-cc-range="volume" aria-label="Volume"></div>
    </div>
    <div class="cc-card wide">
      <div class="cc-title">Now Playing</div>
      <div class="cc-now">
        <div class="cc-art" style="background:linear-gradient(135deg,${track.colors[0]},${track.colors[1]})"></div>
        <div class="cc-meta"><b>${track.title}</b><small>${track.artist} · ${fmtDuration(m.position)} / ${fmtDuration(track.duration)}</small></div>
        <button class="cc-play" data-cc="playpause" aria-label="Play or pause">${glyph(m.playing ? 'pause' : 'play', 12, 2.4)}</button>
      </div>
    </div>`;

  c.querySelectorAll('[data-cc]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = btn.dataset.cc;
      if (k === 'wifi') store.set('wifi', !store.get('wifi'));
      else if (k === 'bluetooth') store.set('bluetooth', !store.get('bluetooth'));
      else if (k === 'airdrop') store.set('airdrop', !store.get('airdrop'));
      else if (k === 'focus') {
        const next = store.get('focusMode') === 'off' ? 'work' : 'off';
        store.set('focusMode', next);
        store.set('dnd', next !== 'off');
      } else if (k === 'dark') store.set('theme', dark ? 'light' : 'dark');
      else if (k === 'nightsight') store.set('nightShift', !store.get('nightShift'));
      else if (k === 'stage') store.set('stageManager', !store.get('stageManager'));
      else if (k === 'mirror') alertModal({ title: 'Screen Mirroring', body: 'No displays found. Turn on AirPlay or connect an external monitor to mirror CanopyOS.', art: 'cast' });
      else if (k === 'playpause') media.toggle();
      sound.play('toggle');
      render();
    });
  });

  c.querySelectorAll('[data-cc-range]').forEach((range) => {
    range.addEventListener('input', () => {
      const k = range.dataset.ccRange;
      const v = Number(range.value);
      if (k === 'brightness') store.set('brightness', v);
      else if (k === 'volume') { store.set('volume', v); media.setVolume(v); }
      const title = range.closest('.cc-card')?.querySelector('.cc-title span');
      if (title) title.textContent = `${v}%`;
    });
    range.addEventListener('pointerdown', (e) => e.stopPropagation());
  });
}

export function openControlCenter() {
  const c = el();
  if (!c) return;
  render();
  c.hidden = false;
  open = true;
  document.getElementById('mb-cc')?.classList.add('open');
}

export function closeControlCenter() {
  const c = el();
  if (!c || c.hidden) return;
  c.hidden = true;
  open = false;
  document.getElementById('mb-cc')?.classList.remove('open');
}

export function toggleControlCenter() {
  if (!el().hidden) closeControlCenter();
  else openControlCenter();
}

document.addEventListener('pointerdown', (e) => {
  if (!open) return;
  if (e.target.closest('#control-center, #mb-cc')) return;
  closeControlCenter();
}, true);

media.subscribe(() => { if (open) render(); });
window.addEventListener('canopy:setting', () => { if (open) render(); });
