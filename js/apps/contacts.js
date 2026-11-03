/* CanopyOS — Contacts */
import { data } from '../core/data.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, uid, copyText } from '../core/util.js';
import { alertModal, confirmModal } from '../ui/modal.js';

const COLORS = ['#0a84ff', '#34c759', '#ff9f0a', '#ff375f', '#8e5cf7', '#5ac8fa', '#ffd60a', '#bf5af2'];

export default {
  id: 'contacts',
  name: 'Contacts',
  icon: 'contacts',
  colors: ['#f6f7f9', '#c3cbd6'],
  iconOpts: { strokeWidth: 1.8 },
  width: 860, height: 560,
  keywords: ['people', 'address book', 'phone', 'names'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Contact', shortcut: '⌘N', action: () => win?._newContact() },
      { label: 'Delete Contact', action: () => win?._delete() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'View', items: [
      { label: 'Show Favorites', action: () => window.dispatchEvent(new CustomEvent('canopy:contacts-fav')) },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let contacts = data.get('contacts', []);
    let selectedId = args?.id ? contacts.find((c) => c.id === args.id || c.name === args.id)?.id : contacts[0]?.id;
    let query = '';
    let favOnly = false;
    let editing = null;

    root.innerHTML = `<div class="contacts">
      <aside class="contacts-side">
        <div class="contacts-search"><label class="fn-search">${glyph('search', 12, 2)}<input type="search" placeholder="Search" data-search aria-label="Search contacts" /></label></div>
        <div class="contacts-list scroll-thin" data-list></div>
      </aside>
      <section class="contacts-main scroll-thin" data-main></section>
    </div>`;

    const listEl = root.querySelector('[data-list]');
    const mainEl = root.querySelector('[data-main]');

    const selected = () => contacts.find((c) => c.id === selectedId);
    const persist = () => data.set('contacts', contacts);
    const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

    function renderList() {
      const list = contacts
        .filter((c) => !favOnly || c.favorite)
        .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || (c.email || '').includes(query) || (c.company || '').toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
      const groups = {};
      list.forEach((c) => { const k = c.name[0].toUpperCase(); (groups[k] = groups[k] || []).push(c); });
      listEl.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([letter, items]) => `<div class="contacts-letter">${letter}</div>
        ${items.map((c) => `<button class="contacts-row ${c.id === selectedId ? 'active' : ''}" data-id="${c.id}">
          <span class="contacts-avatar" style="background:${c.color}">${initials(c.name)}</span>
          <span class="contacts-row-main"><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.company || c.email || '')}</small></span>
          ${c.favorite ? `<span class="contacts-fav">${glyph('star', 11, 2)}</span>` : ''}
        </button>`).join('')}`).join('') : `<div class="empty-state" style="padding:30px 10px">${glyph('contacts', 32)}<div>No contacts</div></div>`;
      listEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { selectedId = b.dataset.id; editing = null; renderList(); renderDetail(); }));
    }

    function renderDetail() {
      const c = selected();
      if (editing) return renderEdit(editing);
      if (!c) {
        mainEl.innerHTML = `<div class="empty-state">${glyph('contacts', 44)}<div>Select a contact</div></div>`;
        return;
      }
      mainEl.innerHTML = `<div class="contact-card">
        <div class="contact-hero">
          <div class="contact-avatar-lg" style="background:${c.color}">${initials(c.name)}</div>
          <div class="contact-hero-name">${escapeHtml(c.name)}</div>
          <div class="tiny muted">${escapeHtml(c.role || '')}${c.company && c.company !== '—' ? ' · ' + escapeHtml(c.company) : ''}</div>
          <div class="contact-actions">
            <button class="contact-action" data-act="message">${glyph('messages', 16, 1.8)}<span>Message</span></button>
            <button class="contact-action" data-act="mail">${glyph('mail', 16, 1.8)}<span>Mail</span></button>
            <button class="contact-action" data-act="call">${glyph('voice', 16, 1.8)}<span>Call</span></button>
            <button class="contact-action" data-act="fav">${glyph('star', 16, 1.8)}<span>${c.favorite ? 'Unfavorite' : 'Favorite'}</span></button>
          </div>
        </div>
        <div class="contact-fields">
          ${c.phone && c.phone !== '—' ? `<div class="contact-field"><small>phone</small><button data-copy="${escapeHtml(c.phone)}">${escapeHtml(c.phone)}</button></div>` : ''}
          ${c.email && c.email !== '—' ? `<div class="contact-field"><small>email</small><button data-copy="${escapeHtml(c.email)}">${escapeHtml(c.email)}</button></div>` : ''}
          ${c.company ? `<div class="contact-field"><small>company</small><div>${escapeHtml(c.company)}</div></div>` : ''}
          ${c.notes ? `<div class="contact-field"><small>notes</small><div>${escapeHtml(c.notes)}</div></div>` : ''}
        </div>
        <div class="hstack" style="margin-top:14px">
          <button class="btn small" data-edit>Edit</button>
          <button class="btn small danger" data-del>Delete</button>
        </div>
      </div>`;
      mainEl.querySelector('[data-edit]').addEventListener('click', () => { editing = { ...c }; renderDetail(); });
      mainEl.querySelector('[data-del]').addEventListener('click', () => win._delete());
      mainEl.querySelector('[data-act="fav"]').addEventListener('click', () => { c.favorite = !c.favorite; persist(); renderList(); renderDetail(); sound.play('pop'); });
      mainEl.querySelector('[data-act="message"]').addEventListener('click', () => {
        const thread = data.get('messages', []).find((t) => t.name === c.name);
        if (thread) wm.open('messages', { args: { thread: thread.id } });
        else {
          const list = data.get('messages', []);
          const t = { id: uid('t'), name: c.name, color: c.color, unread: 0, messages: [] };
          list.unshift(t);
          data.set('messages', list);
          wm.open('messages', { args: { thread: t.id } });
        }
      });
      mainEl.querySelector('[data-act="mail"]').addEventListener('click', () => wm.open('mail'));
      mainEl.querySelector('[data-act="call"]').addEventListener('click', () => {
        alertModal({ title: `Calling ${c.name}`, body: `Dialing ${escapeHtml(c.phone || 'Canopy Network')}…<br><span class="tiny muted">Calls are simulated in CanopyOS.</span>`, art: 'voice' });
        sound.play('notify');
      });
      mainEl.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { copyText(b.dataset.copy); b.classList.add('copied'); setTimeout(() => b.classList.remove('copied'), 700); }));
    }

    function renderEdit(c) {
      mainEl.innerHTML = `<div class="contact-card">
        <div class="contact-hero"><div class="contact-avatar-lg" style="background:${c.color}">${initials(c.name || 'New')}</div></div>
        <div class="contact-form">
          <label>First & Last<input data-e="name" value="${escapeHtml(c.name || '')}" placeholder="Name"></label>
          <label>Company<input data-e="company" value="${escapeHtml(c.company || '')}"></label>
          <label>Role<input data-e="role" value="${escapeHtml(c.role || '')}"></label>
          <label>Email<input data-e="email" value="${escapeHtml(c.email || '')}"></label>
          <label>Phone<input data-e="phone" value="${escapeHtml(c.phone || '')}"></label>
          <label>Notes<textarea data-e="notes" rows="3">${escapeHtml(c.notes || '')}</textarea></label>
          <div class="hstack"><span class="spacer"></span><button class="btn small" data-cancel>Cancel</button><button class="btn small primary" data-save>Save</button></div>
        </div>
      </div>`;
      const draft = { ...c };
      mainEl.querySelectorAll('[data-e]').forEach((i) => i.addEventListener('input', () => { draft[i.dataset.e] = i.value; }));
      mainEl.querySelector('[data-cancel]').addEventListener('click', () => { editing = null; renderDetail(); });
      mainEl.querySelector('[data-save]').addEventListener('click', () => {
        if (!draft.name.trim()) return;
        if (c.id) {
          contacts = contacts.map((x) => (x.id === c.id ? { ...x, ...draft } : x));
          selectedId = c.id;
        } else {
          draft.id = uid('c');
          draft.color = COLORS[contacts.length % COLORS.length];
          draft.favorite = false;
          contacts = [draft, ...contacts];
          selectedId = draft.id;
        }
        persist();
        editing = null;
        sound.play('success');
        renderList();
        renderDetail();
      });
    }

    win._newContact = () => { editing = { name: '', company: '', role: '', email: '', phone: '', notes: '', color: COLORS[contacts.length % COLORS.length] }; renderDetail(); };
    win._delete = async () => {
      const c = selected();
      if (!c) return;
      const ok = await confirmModal({ title: `Delete ${c.name}?`, body: 'This contact will be removed from all devices.', okLabel: 'Delete' });
      if (!ok) return;
      contacts = contacts.filter((x) => x.id !== c.id);
      selectedId = contacts[0]?.id;
      persist();
      renderList();
      renderDetail();
      sound.play('trash');
    };

    root.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; renderList(); });
    window.addEventListener('canopy:contacts-fav', () => { favOnly = !favOnly; renderList(); });

    function render() {
      renderList();
      renderDetail();
      toolbar.innerHTML = `<span class="fn-toolbar-title">All Contacts</span><span class="spacer"></span>
        <button class="btn small no-drag ${favOnly ? 'primary' : ''}" data-fav>${glyph('star', 11, 2)} Favorites</button>
        <button class="btn small no-drag" data-new>${glyph('plus', 11, 2.6)} Contact</button>`;
      toolbar.querySelector('[data-new]').addEventListener('click', () => win._newContact());
      toolbar.querySelector('[data-fav]').addEventListener('click', () => { favOnly = !favOnly; render(); });
    }

    render();
    const sub = data.subscribe('contacts', (list) => { contacts = list; render(); });
    win.onClose(() => sub());
  },
};
