/* CanopyOS — Messages */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, relTime, uid, fmtTime } from '../core/util.js';

const REPLIES = ['Sounds good!', 'Ha! Love that.', 'On it 🌿', 'Can we talk later?', 'Perfect, thanks!', 'Just saw this — replying now.', 'Yes, absolutely.'];
const PALETTE = ['#0a84ff', '#34c759', '#ff9f0a', '#ff375f', '#8e5cf7', '#5ac8fa'];

export default {
  id: 'messages',
  name: 'Messages',
  icon: 'messages',
  colors: ['#5ee07a', '#12a150'],
  width: 860, height: 600,
  keywords: ['chat', 'text', 'imessage', 'sms'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New Message', shortcut: '⌘N', action: () => win?._newThread() },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Conversation', items: [
      { label: 'Mark All Read', action: () => win?._markAllRead() },
      { label: 'Delete Conversation', action: () => win?._deleteThread() },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let threads = data.get('messages', []);
    let activeId = args?.thread || threads[0]?.id;
    let draft = '';
    let search = '';
    let typing = false;

    root.innerHTML = `<div class="msg">
      <aside class="msg-side">
        <div class="msg-search"><label class="fn-search">${glyph('search', 12, 2)}<input type="search" placeholder="Search" data-search aria-label="Search conversations" /></label></div>
        <div class="msg-threads scroll-thin" data-threads></div>
      </aside>
      <section class="msg-main">
        <div class="msg-head"><div data-head></div><span class="spacer"></span><button class="icon-btn" data-info title="Details">${glyph('info', 15, 1.8)}</button></div>
        <div class="msg-body scroll-thin" data-body></div>
        <div class="msg-input"><button class="icon-btn" data-plus title="Attach">${glyph('plusCircle', 18, 1.6)}</button>
          <input type="text" placeholder="Message" data-input aria-label="Message" />
          <button class="msg-send" data-send aria-label="Send">${glyph('chevronUp', 14, 2.6)}</button></div>
      </section>
    </div>`;

    const threadsEl = root.querySelector('[data-threads]');
    const bodyEl = root.querySelector('[data-body]');
    const headEl = root.querySelector('[data-head]');
    const input = root.querySelector('[data-input]');
    const searchEl = root.querySelector('[data-search]');

    const current = () => threads.find((t) => t.id === activeId);
    const persist = () => data.set('messages', threads);

    function renderThreads() {
      const list = threads.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.messages.some((m) => m.text.toLowerCase().includes(search.toLowerCase())));
      threadsEl.innerHTML = list.length ? list.map((t) => {
        const last = t.messages[t.messages.length - 1];
        return `<button class="msg-thread ${t.id === activeId ? 'active' : ''}" data-id="${t.id}">
          <span class="msg-avatar" style="background:${t.color}">${escapeHtml(t.name.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span>
          <span class="msg-thread-main"><span class="msg-thread-top"><b>${escapeHtml(t.name)}</b><span class="tiny muted">${last ? relTime(last.ts) : ''}</span></span>
            <span class="msg-thread-sub">${escapeHtml(last?.text || 'No messages yet')}</span></span>
          ${t.unread ? `<span class="msg-unread">${t.unread}</span>` : ''}
        </button>`;
      }).join('') : `<div class="empty-state" style="padding:24px">${glyph('messages', 30)}<div>No conversations</div></div>`;
      threadsEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { activeId = b.dataset.id; const t = current(); if (t) t.unread = 0; persist(); render(); }));
    }

    function renderChat() {
      const t = current();
      if (!t) {
        headEl.innerHTML = '<b>Messages</b>';
        bodyEl.innerHTML = `<div class="empty-state">${glyph('messages', 42)}<div>Select a conversation</div></div>`;
        return;
      }
      headEl.innerHTML = `<div class="hstack"><span class="msg-avatar sm" style="background:${t.color}">${escapeHtml(t.name.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span><div><b>${escapeHtml(t.name)}</b><div class="tiny muted">${typing ? 'typing…' : 'Canopy Network'}</div></div></div>`;
      bodyEl.innerHTML = t.messages.map((m) => `<div class="msg-bubble-row ${m.from}">
        ${m.from === 'them' ? `<span class="msg-avatar xs" style="background:${t.color}">${escapeHtml(t.name[0])}</span>` : ''}
        <div class="msg-bubble ${m.from}">${escapeHtml(m.text)}<time>${fmtTime(new Date(m.ts), { h24: false })}</time></div>
      </div>`).join('') + (typing ? `<div class="msg-bubble-row them"><span class="msg-avatar xs" style="background:${t.color}">${escapeHtml(t.name[0])}</span><div class="msg-bubble them msg-typing"><i></i><i></i><i></i></div></div>` : '');
      bodyEl.scrollTop = bodyEl.scrollHeight;
      win.setTitle(`Messages — ${t.name}`);
    }

    function send() {
      const text = input.value.trim();
      if (!text) return;
      const t = current();
      if (!t) return;
      t.messages.push({ id: uid('msg'), from: 'me', text, ts: Date.now() });
      input.value = '';
      draft = '';
      persist();
      renderThreads();
      renderChat();
      sound.play('pop');
      typing = true;
      renderChat();
      setTimeout(() => {
        typing = false;
        const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
        t.messages.push({ id: uid('msg'), from: 'them', text: reply, ts: Date.now() });
        persist();
        renderThreads();
        renderChat();
        sound.play('notify');
        if (document.hidden || !root.isConnected) {
          import('../core/notify.js').then(({ notify }) => notify.post({ title: t.name, body: reply, app: 'Messages', appId: 'messages', icon: 'messages', colors: ['#5ee07a', '#12a150'] }));
        }
      }, 1400 + Math.random() * 1200);
    }

    win._newThread = () => {
      const contacts = data.get('contacts', []);
      const pick = contacts[Math.floor(Math.random() * contacts.length)];
      const existing = threads.find((t) => t.name === pick.name);
      if (existing) { activeId = existing.id; render(); return; }
      const t = { id: uid('t'), name: pick.name, color: pick.color || PALETTE[0], unread: 0, messages: [] };
      threads.unshift(t);
      activeId = t.id;
      persist();
      render();
    };
    win._markAllRead = () => { threads.forEach((t) => { t.unread = 0; }); persist(); render(); };
    win._deleteThread = () => {
      threads = threads.filter((t) => t.id !== activeId);
      activeId = threads[0]?.id;
      persist();
      render();
    };

    root.querySelector('[data-send]').addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    searchEl.addEventListener('input', () => { search = searchEl.value; renderThreads(); });
    root.querySelector('[data-info]').addEventListener('click', () => {
      const t = current();
      if (!t) return;
      import('../ui/modal.js').then(({ alertModal }) => alertModal({ title: t.name, art: 'user', body: `${t.messages.length} messages<br><span class="tiny muted">Simulated conversation stored locally in your browser.</span>` }));
    });
    root.querySelector('[data-plus]').addEventListener('click', () => {
      import('../ui/modal.js').then(({ alertModal }) => alertModal({ title: 'Attachments', body: 'Drag a file from Finder, or open the Photos app to share a photo. Attachments are simulated in this build.', art: 'doc' }));
    });

    function render() {
      renderThreads();
      renderChat();
      const t = current();
      toolbar.innerHTML = `<span class="fn-toolbar-title">${t ? escapeHtml(t.name) : 'Messages'}</span><span class="spacer"></span>
        <span class="tiny muted no-drag">${threads.length} conversations</span>`;
    }

    render();
    setTimeout(() => input.focus(), 200);
    const sub = data.subscribe('messages', (list) => { threads = list; render(); });
    win.onClose(() => sub());
  },
};
