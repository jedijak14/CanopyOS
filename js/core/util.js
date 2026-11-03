/* CanopyOS — shared helpers */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const throttle = (fn, ms = 60) => { let last = 0; let t; return (...a) => { const now = Date.now(); clearTimeout(t); if (now - last >= ms) { last = now; fn(...a); } else t = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last)); }; };

export function fmtTime(d = new Date(), { seconds = false, h24 = false } = {}) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  if (!h24) {
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m}${seconds ? ':' + s : ''} ${ap}`;
  }
  return `${String(h).padStart(2, '0')}:${m}${seconds ? ':' + s : ''}`;
}

export function fmtDate(d = new Date(), opts = {}) {
  return d.toLocaleDateString('en-US', { weekday: opts.weekday || 'long', month: 'long', day: 'numeric', ...(opts.year ? { year: 'numeric' } : {}) });
}

export function fmtShortDate(d = new Date()) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export function fmtNumber(n) {
  return Number(n || 0).toLocaleString('en-US');
}

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const total = daysInMonth(year, month);
  const prevTotal = daysInMonth(year, month - 1);
  const cells = [];
  for (let i = startDay - 1; i >= 0; i--) cells.push({ day: prevTotal - i, dim: true, date: new Date(year, month - 1, prevTotal - i) });
  for (let d = 1; d <= total; d++) cells.push({ day: d, dim: false, date: new Date(year, month, d) });
  let next = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    if (cells.length >= 42) break;
    cells.push({ day: next, dim: true, date: new Date(year, month + 1, next++) });
  }
  return cells;
}

export function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }
}

export function download(name, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function textColorFor(hex) {
  const m = String(hex).replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff';
}

export function seededRandom(seed) {
  let s = typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) : seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function storageEstimate() {
  let chars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      chars += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
  } catch (e) { chars = 0; }
  return chars;
}

export function monthName(m) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];
}

export function timeAgoShort(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export function greet() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
