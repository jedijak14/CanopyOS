/* CanopyOS — modal dialogs returning promises */
import { glyph } from '../core/icons.js';
import { sound } from '../core/sound.js';

const root = () => document.getElementById('modal-root');

function mount(html) {
  const r = root();
  r.innerHTML = html;
  r.classList.add('show');
  return r;
}
function unmount() {
  const r = root();
  r.classList.remove('show');
  r.innerHTML = '';
}

export function alertModal({ title = 'CanopyOS', body = '', art = 'info', okLabel = 'OK', danger = false } = {}) {
  return new Promise((resolve) => {
    const r = mount(`<div class="modal" role="dialog" aria-modal="true">
      ${art ? `<div class="m-art">${glyph(art, 44, 1.4)}</div>` : ''}
      <h3>${title}</h3><div class="m-body">${body}</div>
      <div class="m-actions"><button class="btn primary ${danger ? 'danger' : ''}" data-ok>${okLabel}</button></div>
    </div>`);
    sound.play('pop');
    const done = () => { unmount(); document.removeEventListener('keydown', key); resolve(true); };
    const key = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); done(); } };
    document.addEventListener('keydown', key);
    r.querySelector('[data-ok]').addEventListener('click', done);
    r.querySelector('[data-ok]').focus();
  });
}

export function confirmModal({ title = 'Are you sure?', body = '', okLabel = 'OK', cancelLabel = 'Cancel', danger = true, art = 'warning' } = {}) {
  return new Promise((resolve) => {
    const r = mount(`<div class="modal" role="dialog" aria-modal="true">
      ${art ? `<div class="m-art">${glyph(art, 44, 1.4)}</div>` : ''}
      <h3>${title}</h3><div class="m-body">${body}</div>
      <div class="m-actions"><button class="btn" data-cancel>${cancelLabel}</button><button class="btn primary ${danger ? 'danger' : ''}" data-ok>${okLabel}</button></div>
    </div>`);
    sound.play('pop');
    let settled = false;
    const finish = (v) => { if (settled) return; settled = true; unmount(); document.removeEventListener('keydown', key); resolve(v); };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    };
    document.addEventListener('keydown', key);
    r.querySelector('[data-ok]').addEventListener('click', () => finish(true));
    r.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
    r.querySelector('[data-ok]').focus();
  });
}

export function promptModal({ title = 'Enter a name', label = '', value = '', placeholder = '', okLabel = 'OK', validate } = {}) {
  return new Promise((resolve) => {
    const r = mount(`<div class="modal" role="dialog" aria-modal="true">
      <h3>${title}</h3>
      <div class="m-body">${label ? `<label class="tiny muted">${label}</label>` : ''}<input type="text" data-input value="${String(value).replace(/"/g, '&quot;')}" placeholder="${placeholder}" />
      <div class="tiny" data-err style="color:#ff453a;height:14px;margin-top:4px"></div></div>
      <div class="m-actions"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok>${okLabel}</button></div>
    </div>`);
    sound.play('pop');
    const input = r.querySelector('[data-input]');
    const err = r.querySelector('[data-err]');
    let settled = false;
    const finish = (v) => { if (settled) return; settled = true; unmount(); document.removeEventListener('keydown', key); resolve(v); };
    const submit = () => {
      const v = input.value.trim();
      if (!v) { err.textContent = 'Please enter a name.'; input.focus(); return; }
      if (validate) {
        const msg = validate(v);
        if (msg) { err.textContent = msg; input.focus(); return; }
      }
      finish(v);
    };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    };
    document.addEventListener('keydown', key);
    r.querySelector('[data-ok]').addEventListener('click', submit);
    r.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
    input.focus();
    input.select();
  });
}
