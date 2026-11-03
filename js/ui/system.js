/* CanopyOS — session lifecycle: boot, lock, sleep, restart, shutdown */
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';
import { wm } from '../core/wm.js';
import { fs } from '../core/fs.js';
import { fmtTime, fmtDate, formatBytes, storageEstimate } from '../core/util.js';
import { glyph } from '../core/icons.js';
import { alertModal, confirmModal } from './modal.js';

const q = (s) => document.querySelector(s);

let lockTimer = null;
let booted = false;

function tickLockClock() {
  const t = q('.lock-time');
  const d = q('.lock-date');
  if (t) t.textContent = fmtTime(new Date(), { h24: store.get('clock24'), seconds: false });
  if (d) d.textContent = fmtDate(new Date(), { year: true });
}

export const system = {
  booted: false,

  async boot({ chime = true } = {}) {
    const boot = q('#boot');
    const bar = q('.boot-bar span');
    const status = q('.boot-status');
    boot.hidden = false;
    boot.classList.remove('done');
    q('#lockscreen').hidden = true;
    q('#shutdown-layer').hidden = true;
    q('#sleep-layer').hidden = true;
    bar.style.width = '0%';
    const steps = [[12, 'Loading kernel…'], [34, 'Mounting Canopy file system…'], [58, 'Starting window server…'], [78, 'Restoring your workspace…'], [100, 'Ready']];
    for (const [pct, label] of steps) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 130));
      bar.style.width = `${pct}%`;
      status.textContent = label;
    }
    await new Promise((r) => setTimeout(r, 260));
    boot.classList.add('done');
    setTimeout(() => { boot.hidden = true; }, 520);
    system.booted = true;
    if (chime) sound.play('chime');
    store.set('firstRun', false);
    setTimeout(() => system.afterBoot(), 620);
  },

  afterBoot() {
    if (!sessionStorage.getItem('canopy.welcomed')) {
      sessionStorage.setItem('canopy.welcomed', '1');
      wm.open('finder', { args: { path: '/Users/canopy/Desktop' } });
      setTimeout(() => {
        import('../core/notify.js').then(({ notify }) => {
          notify.post({
            title: 'Welcome to CanopyOS',
            body: `Press ⌘K to search, right-click the desktop, or open Terminal and type "help".`,
            app: 'CanopyOS', icon: 'canopy', colors: ['#34e0a1', '#0a6e77'],
          });
        });
      }, 1400);
    }
  },

  lock({ silent = false } = {}) {
    const lock = q('#lockscreen');
    if (!lock.hidden) return;
    lock.hidden = false;
    lock.classList.remove('unlocking');
    tickLockClock();
    clearInterval(lockTimer);
    lockTimer = setInterval(tickLockClock, 1000);
    const wp = q('#wallpaper');
    lock.style.background = wp ? getComputedStyle(wp).background : '#0b1220';
    lock.style.backgroundImage = wp ? getComputedStyle(wp).backgroundImage : 'none';
    const input = q('#lock-input');
    input.value = '';
    input.type = 'password';
    setTimeout(() => input.focus(), 120);
    if (!silent) sound.play('lock');
    window.dispatchEvent(new CustomEvent('canopy:lock'));
  },

  unlock() {
    const pass = store.get('lockPassword');
    if (store.get('requirePassword') && pass) {
      const input = q('#lock-input');
      if (input.value !== pass) {
        const box = q('.lock-pass');
        box.classList.add('lock-error');
        sound.play('error');
        setTimeout(() => box.classList.remove('lock-error'), 400);
        input.value = '';
        return false;
      }
    }
    const lock = q('#lockscreen');
    lock.classList.add('unlocking');
    clearInterval(lockTimer);
    sound.play('unlock');
    setTimeout(() => { lock.hidden = true; lock.classList.remove('unlocking'); }, 420);
    window.dispatchEvent(new CustomEvent('canopy:unlock'));
    return true;
  },

  sleep() {
    sound.play('swish');
    const layer = q('#sleep-layer');
    layer.hidden = false;
    layer.onclick = () => { layer.hidden = true; system.lock({ silent: true }); };
    setTimeout(() => { layer.onclick = () => { layer.hidden = true; system.lock({ silent: true }); }; }, 400);
  },

  async restart() {
    const ok = await confirmModal({ title: 'Restart CanopyOS?', body: 'All open windows will close. Your files and settings are saved.', okLabel: 'Restart', art: 'refresh', danger: false });
    if (!ok) return;
    wm.closeAll();
    sound.play('swish');
    setTimeout(() => system.boot({ chime: true }), 500);
  },

  async shutdown() {
    const ok = await confirmModal({ title: 'Shut Down CanopyOS?', body: 'Your files and settings are saved automatically.', okLabel: 'Shut Down', art: 'power' });
    if (!ok) return;
    wm.closeAll();
    q('#lockscreen').hidden = true;
    q('#shutdown-layer').hidden = false;
    q('#shutdown-layer').style.opacity = '1';
    sound.play('swish');
    q('#power-on').onclick = () => {
      q('#shutdown-layer').hidden = true;
      system.boot({ chime: true });
    };
  },

  async logOut() {
    const ok = await confirmModal({ title: 'Log out of CanopyOS?', body: 'Your open windows will close.', okLabel: 'Log Out', art: 'user' });
    if (!ok) return;
    wm.closeAll();
    system.lock({ silent: true });
  },

  about() {
    const stats = fs.stats();
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
    const body = `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(150deg,#34e0a1,#0a6e77);display:grid;place-items:center;color:#fff">${glyph('canopy', 28, 2.2)}</div>
        <div><div style="font-size:17px;font-weight:600;color:var(--text)">CanopyOS 1.0</div><div class="tiny muted">"Understory" · open source</div></div>
      </div>
      <div class="tiny" style="line-height:1.7">
        <div><b style="color:var(--text)">User</b> &nbsp; ${store.get('userName')}</div>
        <div><b style="color:var(--text)">Browser</b> &nbsp; ${browser}</div>
        <div><b style="color:var(--text)">Display</b> &nbsp; ${window.innerWidth} × ${window.innerHeight} @ ${window.devicePixelRatio || 1}x</div>
        <div><b style="color:var(--text)">Storage</b> &nbsp; ${formatBytes(storageEstimate())} used · ${stats.files} files, ${stats.folders} folders</div>
        <div><b style="color:var(--text)">Uptime</b> &nbsp; ${Math.floor(performance.now() / 60000)} minutes</div>
        <div style="margin-top:8px;color:var(--text-faint)">Every icon, wallpaper and sound in CanopyOS is built from scratch with CSS, SVG and WebAudio. No Apple assets are used.</div>
      </div>`;
    alertModal({ title: 'About This Canopy', body, art: '', okLabel: 'Nice' });
  },

  shortcuts() {
    import('./shortcuts.js').then(({ showShortcuts }) => showShortcuts());
  },
};

export function initSession() {
  const input = q('#lock-input');
  const go = q('#lock-go');
  const tryUnlock = () => system.unlock();
  go?.addEventListener('click', tryUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
    if (e.key === 'Escape') input.blur();
  });
  document.querySelectorAll('[data-lock-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.lockAction;
      if (a === 'sleep') system.sleep();
      if (a === 'restart') { q('#lockscreen').hidden = true; system.boot(); }
      if (a === 'shutdown') { q('#lockscreen').hidden = true; q('#shutdown-layer').hidden = false; q('#power-on').onclick = () => { q('#shutdown-layer').hidden = true; system.boot(); }; }
    });
  });
  // click the lock screen backdrop to focus the password field
  q('#lockscreen')?.addEventListener('pointerdown', (e) => {
    if (e.target.id === 'lockscreen') input?.focus();
  });
  // auto lock
  setInterval(() => {
    const mins = Number(store.get('autoLockMinutes') || 0);
    if (!mins) return;
    if (Date.now() - lastActivity > mins * 60000) system.lock({ silent: true });
  }, 15000);
}

let lastActivity = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => {
  window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true });
});

export function sessionBoot() {
  if (booted) return;
  booted = true;
  system.boot();
}
