/* CanopyOS — Mail */
import { data } from '../core/data.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, relTime, uid, fmtShortDate } from '../core/util.js';
import { notify } from '../core/notify.js';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'mail' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'sent', label: 'Sent', icon: 'upload' },
  { id: 'drafts', label: 'Drafts', icon: 'doc' },
  { id: 'trash', label: 'Bin', icon: 'trash' },
];

export default {
  id: 'mail',
  name: 'Mail',
  icon: 'mail',
  colors: ['#5aa9ff', '#1667d6'],
  width: 980, height: 620,
  keywords: ['email', 'inbox', 'messages', 'compose'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Message', shortcut: '⌘N', action: () => win?._compose() },
      { label: 'Refresh', shortcut: '⌘R', action: () => win?._refresh() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Message', items: [
      { label: 'Reply', shortcut: '⌘R', action: () => win?._reply() },
      { label: 'Mark as Read', action: () => win?._markRead() },
      { label: 'Mark as Unread', action: () => win?._markUnread() },
      { sep: true },
      { label: 'Move to Bin', shortcut: '⌫', action: () => win?._delete() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let mail = data.get('mail', []);
    let folder = 'inbox';
    let openId = null;
    let composing = null;
    let query = '';

    root.innerHTML = `<div class="mail">
      <aside class="mail-side">
        <button class="btn small primary mail-compose" data-compose>${glyph('textedit', 12, 2)} New Message</button>
        <div class="mail-folders" data-folders></div>
        <div class="mail-storage"><div class="mail-storage-bar"><span style="width:18%"></span></div><div class="tiny muted">2.4 GB of 50 GB used</div></div>
      </aside>
      <section class="mail-list">
        <div class="mail-list-head"><b data-folder-title>Inbox</b><span class="spacer"></span><span class="tiny muted" data-count></span></div>
        <div class="mail-rows scroll-thin" data-rows></div>
      </section>
      <section class="mail-read" data-read></section>
    </div>`;

    const foldersEl = root.querySelector('[data-folders]');
    const rowsEl = root.querySelector('[data-rows]');
    const readEl = root.querySelector('[data-read]');
    const titleEl = root.querySelector('[data-folder-title]');
    const countEl = root.querySelector('[data-count]');

    const visibleList = () => {
      let list = mail.filter((m) => (folder === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === folder));
      if (query) {
        const q = query.toLowerCase();
        list = list.filter((m) => m.subject.toLowerCase().includes(q) || m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q));
      }
      return list.sort((a, b) => b.date - a.date);
    };
    const current = () => mail.find((m) => m.id === openId);

    function persist() { data.set('mail', mail); }

    function renderFolders() {
      foldersEl.innerHTML = FOLDERS.map((f) => {
        const count = f.id === 'starred' ? mail.filter((m) => m.starred && m.folder !== 'trash').length
          : f.id === 'inbox' ? mail.filter((m) => m.folder === 'inbox' && m.unread).length
            : mail.filter((m) => m.folder === f.id).length;
        return `<button class="mail-folder ${folder === f.id ? 'active' : ''}" data-folder="${f.id}">
          <span class="fn-side-ico">${glyph(f.icon, 14, 1.8)}</span><span>${f.label}</span>${count ? `<span class="fn-side-count">${count}</span>` : ''}
        </button>`;
      }).join('');
      foldersEl.querySelectorAll('[data-folder]').forEach((b) => b.addEventListener('click', () => {
        folder = b.dataset.folder; openId = null; render();
      }));
    }

    function renderList() {
      const list = visibleList();
      titleEl.textContent = FOLDERS.find((f) => f.id === folder)?.label || 'Inbox';
      countEl.textContent = `${list.length} message${list.length === 1 ? '' : 's'}`;
      rowsEl.innerHTML = list.length ? list.map((m) => `<button class="mail-row ${m.unread ? 'unread' : ''} ${m.id === openId ? 'active' : ''}" data-id="${m.id}">
        <span class="mail-dot ${m.unread ? 'on' : ''}"></span>
        <span class="mail-row-main">
          <span class="mail-row-top"><b>${escapeHtml(m.from)}</b><span class="tiny muted">${relTime(m.date)}</span></span>
          <span class="mail-row-subject">${escapeHtml(m.subject)}</span>
          <span class="mail-row-preview">${escapeHtml(m.preview || m.body.slice(0, 90))}</span>
        </span>
        ${m.starred ? `<span class="mail-star on">${glyph('star', 12, 2)}</span>` : ''}
        ${m.hasAttachment ? `<span class="mail-attach">${glyph('doc', 12, 2)}</span>` : ''}
      </button>`).join('') : `<div class="empty-state">${glyph('mail', 34)}<div>${query ? 'No matching messages' : 'No messages here'}</div></div>`;
      rowsEl.querySelectorAll('[data-id]').forEach((r) => r.addEventListener('click', () => openMail(r.dataset.id)));
    }

    function openMail(id) {
      openId = id;
      const m = current();
      if (!m) return;
      m.unread = false;
      persist();
      renderList();
      renderFolders();
      renderRead();
    }

    function renderRead() {
      if (composing) return renderCompose();
      const m = current();
      if (!m) {
        readEl.innerHTML = `<div class="empty-state">${glyph('mail', 42)}<div><b>No message selected</b><br><span class="tiny">Choose a message to read it</span></div></div>`;
        return;
      }
      readEl.innerHTML = `<div class="mail-read-head">
          <div class="mail-subject">${escapeHtml(m.subject)}</div>
          <div class="hstack" style="gap:2px">
            <button class="icon-btn" data-star title="Star">${glyph('star', 15, 1.8)}</button>
            <button class="icon-btn" data-reply title="Reply">${glyph('upload', 15, 1.8)}</button>
            <button class="icon-btn" data-forward title="Forward">${glyph('share', 15, 1.8)}</button>
            <button class="icon-btn" data-del title="Delete">${glyph('trash', 15, 1.8)}</button>
          </div>
        </div>
        <div class="mail-meta">
          <div class="mail-avatar" style="background:${avatarColor(m.from)}">${initials(m.from)}</div>
          <div><b>${escapeHtml(m.from)}</b><div class="tiny muted">${escapeHtml(m.email || '')}</div></div>
          <span class="spacer"></span>
          <div class="tiny muted" style="text-align:right">${fmtShortDate(new Date(m.date))}<br>${new Date(m.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        </div>
        <div class="mail-body scroll-thin selectable">${escapeHtml(m.body).replace(/\n/g, '<br>')}
          ${m.hasAttachment ? `<div class="mail-attachment">${glyph('doc', 18, 1.7)}<div><b>${escapeHtml(m.subject.slice(0, 22))}.pdf</b><div class="tiny muted">248 KB · Attachment</div></div><button class="btn small" data-dl>Quick Look</button></div>` : ''}
        </div>
        <div class="mail-actions"><button class="btn small" data-reply2>${glyph('upload', 11, 2)} Reply</button><button class="btn small" data-forward2>${glyph('share', 11, 2)} Forward</button></div>`;
      readEl.querySelector('[data-star]').addEventListener('click', () => { m.starred = !m.starred; persist(); renderList(); renderRead(); sound.play('pop'); });
      readEl.querySelector('[data-reply]').addEventListener('click', () => win._reply());
      readEl.querySelector('[data-reply2]').addEventListener('click', () => win._reply());
      readEl.querySelector('[data-forward]').addEventListener('click', () => win._forward());
      readEl.querySelector('[data-forward2]').addEventListener('click', () => win._forward());
      readEl.querySelector('[data-del]').addEventListener('click', () => win._delete());
      readEl.querySelector('[data-dl]')?.addEventListener('click', () => {
        import('../ui/quicklook.js').then(({ openQuickLook }) => {});
        notify.post({ title: 'Attachment', body: `${m.subject.slice(0, 22)}.pdf would open in Preview.`, icon: 'doc' });
      });
    }

    function renderCompose() {
      const c = composing;
      readEl.innerHTML = `<div class="mail-read-head"><div class="mail-subject">${c.replyTo ? 'Re: ' : c.forward ? 'Fwd: ' : 'New Message'}</div></div>
        <div class="mail-compose-form">
          <label class="mail-field"><span>To:</span><input type="text" data-c="to" value="${escapeHtml(c.to)}" placeholder="name@example.com" /></label>
          <label class="mail-field"><span>Subject:</span><input type="text" data-c="subject" value="${escapeHtml(c.subject)}" placeholder="Subject" /></label>
          <textarea class="mail-compose-body selectable" data-c="body" placeholder="Write your message…">${escapeHtml(c.body)}</textarea>
          <div class="hstack" style="padding:10px 14px;border-top:1px solid var(--stroke-soft)">
            <button class="btn primary small" data-send>${glyph('upload', 11, 2)} Send</button>
            <button class="btn small" data-draft>Save Draft</button>
            <span class="spacer"></span>
            <button class="btn small ghost" data-cancel>Cancel</button>
          </div>
        </div>`;
      readEl.querySelectorAll('[data-c]').forEach((i) => i.addEventListener('input', () => { composing[i.dataset.c] = i.value; }));
      readEl.querySelector('[data-cancel]').addEventListener('click', () => { composing = null; renderRead(); });
      readEl.querySelector('[data-draft]').addEventListener('click', () => {
        mail.unshift({ id: uid('m'), folder: 'drafts', from: 'Canopy User', email: 'you@canopy.os', subject: composing.subject || 'Untitled draft', preview: composing.body.slice(0, 60), body: composing.body, unread: false, starred: false, date: Date.now(), hasAttachment: false });
        persist(); composing = null; folder = 'drafts'; render();
        notify.post({ title: 'Draft saved', body: 'Find it in the Drafts folder.', app: 'Mail', appId: 'mail', icon: 'mail', colors: ['#5aa9ff', '#1667d6'] });
      });
      readEl.querySelector('[data-send]').addEventListener('click', () => {
        if (!composing.to.trim()) { readEl.querySelector('[data-c="to"]').focus(); return; }
        mail.unshift({
          id: uid('m'), folder: 'sent', from: 'Canopy User', email: 'you@canopy.os',
          to: composing.to, subject: composing.subject || '(no subject)', preview: composing.body.slice(0, 80),
          body: composing.body, unread: false, starred: false, date: Date.now(), hasAttachment: false,
        });
        persist();
        composing = null;
        folder = 'sent';
        openId = null;
        sound.play('success');
        notify.post({ title: 'Message sent', body: `To ${composing?.to || 'recipient'}`, app: 'Mail', appId: 'mail', icon: 'mail', colors: ['#5aa9ff', '#1667d6'] });
        render();
      });
      setTimeout(() => readEl.querySelector('[data-c="to"]')?.focus(), 60);
    }

    win._compose = () => { composing = { to: '', subject: '', body: '' }; openId = null; renderRead(); };
    win._refresh = () => {
      const count = mail.filter((m) => m.folder === 'inbox').length;
      notify.post({ title: 'Mail', body: `Checked for new mail — ${count} messages in Inbox.`, app: 'Mail', appId: 'mail', icon: 'mail', colors: ['#5aa9ff', '#1667d6'] });
      render();
    };
    win._reply = () => {
      const m = current();
      if (!m) return;
      composing = { to: m.email || m.from, subject: m.subject, body: `\n\nOn ${fmtShortDate(new Date(m.date))}, ${m.from} wrote:\n> ${m.body.split('\n').join('\n> ')}`, replyTo: m.id };
      renderRead();
    };
    win._forward = () => {
      const m = current();
      if (!m) return;
      composing = { to: '', subject: m.subject, body: `\n\n---------- Forwarded message ----------\nFrom: ${m.from}\n\n${m.body}`, forward: true };
      renderRead();
    };
    win._delete = () => {
      const m = current();
      if (!m) return;
      m.folder = 'trash';
      openId = null;
      persist(); render();
      sound.play('trash');
    };
    win._markRead = () => { const m = current(); if (m) { m.unread = false; persist(); render(); } };
    win._markUnread = () => { const m = current(); if (m) { m.unread = true; persist(); render(); } };

    function render() {
      renderFolders();
      renderList();
      renderRead();
      toolbar.innerHTML = `<label class="fn-search no-drag" style="width:190px">${glyph('search', 13, 2)}<input type="search" placeholder="Search mail" data-ms aria-label="Search mail" /></label>
        <span class="spacer"></span>
        <button class="icon-btn no-drag" data-refresh title="Refresh">${glyph('refresh', 15, 1.8)}</button>
        <button class="btn small primary no-drag" data-new>${glyph('textedit', 11, 2)} Compose</button>`;
      toolbar.querySelector('[data-ms]').addEventListener('input', (e) => { query = e.target.value; renderList(); });
      toolbar.querySelector('[data-refresh]').addEventListener('click', () => win._refresh());
      toolbar.querySelector('[data-new]').addEventListener('click', () => win._compose());
    }

    root.querySelector('[data-compose]').addEventListener('click', () => win._compose());
    render();
    win._refreshCount = () => render();
    const sub = data.subscribe('mail', (list) => { mail = list; render(); });
    win.onClose(() => sub());
  },
};

function initials(name = '') {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}
function avatarColor(name = '') {
  const colors = ['#0a84ff', '#34c759', '#ff9f0a', '#ff375f', '#8e5cf7', '#5ac8fa'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}
