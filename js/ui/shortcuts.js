/* CanopyOS — global keyboard shortcuts */
import { wm } from '../core/wm.js';
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';

import { escapeHtml } from '../core/util.js';
import { toggleSpotlight, closeSpotlight } from './spotlight.js';
import { toggleLaunchpad, closeLaunchpad } from './launchpad.js';
import { toggleMissionControl, closeMissionControl } from './missioncontrol.js';
import { closeControlCenter } from './controlcenter.js';
import { closeNotificationCenter } from './notificationcenter.js';
import { openSwitcher, cycle as cycleSwitcher, commit as commitSwitcher, cancel as cancelSwitcher, isSwitcherOpen } from './switcher.js';
import { closeQuickLook } from './quicklook.js';
import { system } from './system.js';
import { alertModal } from './modal.js';

const LIST = [
  ['⌘K', 'Spotlight search'], ['⌘Tab', 'Switch apps'], ['^↑', 'Mission Control'],
  ['⌘W', 'Close window'], ['⌘M', 'Minimize window'], ['⌘Q', 'Quit app'],
  ['⌘N', 'New window'], ['⌘,', 'System Settings'], ['⌘/', 'Keyboard shortcuts'],
  ['⇧⌘4', 'Screenshot'], ['^⌘Q', 'Lock screen'], ['⌘⇧3', 'Copy screenshot info'],
  ['Esc', 'Close overlay'], ['⌘↑', 'Mission Control'], ['^← / ^→', 'Switch desktop'],
];

export function showShortcuts() {
  alertModal({
    title: 'Keyboard Shortcuts',
    art: '',
    okLabel: 'Got it',
    body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:6px">
      ${LIST.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid var(--stroke-soft)"><span>${escapeHtml(v)}</span><kbd style="white-space:nowrap">${escapeHtml(k)}</kbd></div>`).join('')}
    </div>
    <div class="tiny muted" style="margin-top:10px">Use ⌘ on macOS or Ctrl elsewhere. Some browser-reserved combinations may be captured by your browser first.</div>`,
  });
}

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey;
    const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    const key = e.key.toLowerCase();

    // switcher intercepts Tab while open
    if (isSwitcherOpen()) {
      if (e.key === 'Tab') { e.preventDefault(); cycleSwitcher(e.shiftKey ? -1 : 1); return; }
      if (e.key === 'Escape') { e.preventDefault(); cancelSwitcher(); return; }
      if (e.key === 'Enter') { e.preventDefault(); commitSwitcher(); return; }
    }

    if (meta && !e.altKey && key === 'k') { e.preventDefault(); toggleSpotlight(); return; }
    if (meta && key === 'tab') { e.preventDefault(); openSwitcher(); return; }
    if (e.ctrlKey && e.key === ' ') { e.preventDefault(); toggleSpotlight(); return; }

    if (meta && key === ',') { e.preventDefault(); wm.open('settings'); return; }
    if (meta && e.key === '/') { e.preventDefault(); showShortcuts(); return; }

    if (meta && !e.shiftKey && key === 'w' && !typing) {
      e.preventDefault();
      const win = wm.focused();
      if (win) win.close();
      return;
    }
    if (meta && !e.shiftKey && key === 'm' && !typing) {
      e.preventDefault();
      wm.focused()?.minimize();
      return;
    }
    if (meta && !e.shiftKey && key === 'q' && !typing) {
      e.preventDefault();
      const win = wm.focused();
      if (win) wm.closeApp(win.appId);
      return;
    }
    if (meta && !e.shiftKey && key === 'n' && !typing) {
      e.preventDefault();
      const win = wm.focused();
      if (win) wm.open(win.appId);
      return;
    }
    if (meta && key === 'h' && !typing) { e.preventDefault(); wm.focused()?.minimize(); return; }

    if ((meta || e.ctrlKey) && e.key === 'ArrowUp') { e.preventDefault(); toggleMissionControl(); return; }
    if (e.ctrlKey && e.key === 'ArrowLeft') { e.preventDefault(); wm.setSpace(wm.currentSpace - 1); sound.play('swish'); return; }
    if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); wm.setSpace(wm.currentSpace + 1); sound.play('swish'); return; }

    if (meta && e.shiftKey && (e.key === '3' || e.key === '4' || e.code === 'Digit3' || e.code === 'Digit4')) {
      e.preventDefault();
      wm.open('screenshot', { args: { capture: true } });
      return;
    }
    if (meta && e.shiftKey && key === 'q') { e.preventDefault(); system.lock(); return; }
    if (e.ctrlKey && meta && key === 'q') { e.preventDefault(); system.lock(); return; }

    if (e.key === 'F3') { e.preventDefault(); toggleMissionControl(); return; }
    if (e.key === 'F4') { e.preventDefault(); toggleLaunchpad(); return; }

    if (e.key === 'Escape' && !typing) {
      closeSpotlight(); closeLaunchpad(); closeMissionControl(); closeControlCenter(); closeNotificationCenter(); closeQuickLook();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (isSwitcherOpen() && (e.key === 'Meta' || e.key === 'Control')) commitSwitcher();
  });

  // prevent context menu on chrome pieces (keep it on editable content)
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea, .selectable, .win-body pre')) return;
    if (e.target.closest('.dock-item, .desk-icon, #desktop, .win-chrome')) e.preventDefault();
    else if (!e.target.closest('.win-body')) e.preventDefault();
  });
}
