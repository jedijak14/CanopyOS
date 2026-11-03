/* CanopyOS — Emoji & Symbols picker (inserts at the caret or copies) */
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { copyText } from '../core/util.js';

const GROUPS = {
  'Smileys': ['😀', '😄', '😁', '😆', '😅', '😂', '🙂', '😉', '😊', '😍', '🥰', '😎', '🤓', '🧐', '🤔', '🤨', '😐', '😴', '😪', '😮', '😲', '🥳', '🤩', '😇', '🙃', '😌', '😔', '😢', '😭', '😤', '😡', '🤯'],
  'Nature': ['🌿', '🌱', '🍃', '🌳', '🌲', '🌴', '🌵', '🎋', '🍀', '🌾', '🌺', '🌸', '🌼', '🌻', '🌷', '🍄', '🌰', '🐿️', '🦉', '🐢', '🦋', '🐝', '🐞', '🌍', '🌙', '⭐', '☀️', '⛅', '🌧️', '🌈', '❄️', '🔥'],
  'Food': ['☕', '🍵', '🥤', '🧋', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🥑', '🥕', '🥦', '🍞', '🥐', '🧇', '🍳', '🍕', '🍜', '🍪', '🍰', '🍫', '🍯'],
  'Activity': ['⚡', '💡', '🔋', '💻', '⌨️', '🖱️', '📱', '🎧', '🎵', '🎹', '🎸', '🎨', '📷', '📸', '🎬', '📚', '✏️', '📝', '📌', '📎', '🔍', '🔧', '🧭', '🗺️', '🎮', '🧩', '♟️', '🎯', '🏆', '🎉'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '✅', '❌', '⚠️', '❓', '❗', '💬', '💭', '🔒', '🔑', '⚙️', '🔔', '♻️', '🚀', '🛰️', '🪴', '🌡️', '📈', '📉', '💾', '🗂️', '📦', '🏷️'],
};

let lastEditable = null;
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input, textarea, [contenteditable="true"]')) lastEditable = e.target;
});

function insert(text) {
  const el = lastEditable;
  if (el && document.body.contains(el) && !el.disabled && !el.readOnly) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (typeof el.value === 'string') {
      el.value = el.value.slice(0, start) + text + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      return true;
    }
    if (el.isContentEditable) {
      el.textContent += text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }
  copyText(text);
  return false;
}

function render() {
  const el = document.getElementById('emoji-picker');
  if (!el) return;
  el.innerHTML = `<div class="emoji-head"><b>Emoji & Symbols</b><button class="icon-btn" data-close>${glyph('close', 12, 2.2)}</button></div>
    <div class="emoji-scroll scroll-thin">
      ${Object.entries(GROUPS).map(([name, list]) => `<div class="emoji-group-title">${name}</div><div class="emoji-grid">${list.map((e) => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>`).join('')}
    </div>
    <div class="emoji-foot tiny muted">Click to insert at the cursor — or copy if no field is focused</div>`;
  el.querySelector('[data-close]').addEventListener('click', closeEmojiPicker);
  el.querySelectorAll('[data-emoji]').forEach((b) => b.addEventListener('click', () => {
    insert(b.dataset.emoji);
    sound.play('pop');
    closeEmojiPicker();
  }));
}

export function openEmojiPicker() {
  const el = document.getElementById('emoji-picker');
  if (!el) return;
  render();
  el.hidden = false;
}

export function closeEmojiPicker() {
  const el = document.getElementById('emoji-picker');
  if (el) el.hidden = true;
}

export function toggleEmojiPicker() {
  const el = document.getElementById('emoji-picker');
  if (!el) return;
  if (el.hidden) openEmojiPicker(); else closeEmojiPicker();
}

document.addEventListener('pointerdown', (e) => {
  const el = document.getElementById('emoji-picker');
  if (!el || el.hidden) return;
  if (e.target.closest('#emoji-picker')) return;
  closeEmojiPicker();
}, true);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.code === 'Space' && e.ctrlKey && e.metaKey) {
    e.preventDefault();
    toggleEmojiPicker();
  }
});
