/* CanopyOS — virtual file system backed by localStorage */

const KEY = 'canopy.fs.v1';
export const HOME = '/Users/canopy';

const now = () => Date.now();

function file(name, content = '', meta = {}) {
  return { type: 'file', name, content, meta: { created: now(), modified: now(), tags: [], ...meta } };
}
function dir(name, children = [], meta = {}) {
  return { type: 'folder', name, children, meta: { created: now(), modified: now(), tags: [], ...meta } };
}

function seed() {
  return dir('', [
    dir('Applications', [], { kind: 'apps', locked: true }),
    dir('Users', [
      dir('canopy', [
        dir('Desktop', [
          file('Welcome.txt', `Welcome to CanopyOS 🌿

CanopyOS is an original, open-source desktop environment that runs
entirely in your browser. Everything you see here — icons, wallpapers,
sounds, window chrome — is drawn from scratch with CSS and SVG.

A few things to try:
  • Press ⌘K (or Ctrl+K) to open Spotlight.
  • Right-click the desktop for quick actions.
  • Open Terminal and type "help" for a full command list.
  • Drag a window to a screen edge to snap it.
  • Try Mission Control with ^↑ (Ctrl+Up).

Nothing here is sent to a server. Your files live in this browser's
local storage, so they survive a refresh — but not clearing site data.

Enjoy the shade. 🌳
`),
          file('Read Me.md', `# CanopyOS

An open source desktop experience for the web.

## Highlights
- Real window management: drag, resize, snap, tile, minimize
- Spotlight search across apps and files
- Launchpad, Mission Control, Spaces, widgets
- A working shell with 30+ commands
- Notes, Mail, Calendar, Photos, Music, Paint, Games and more

## Keyboard
| Shortcut | Action |
| --- | --- |
| ⌘K | Spotlight |
| ⌘Tab | App switcher |
| ^↑ | Mission Control |
| ⌘W | Close window |

> Built with vanilla JavaScript. No frameworks, no trackers, no build step.
`),
          file('shopping-list.txt', 'Oat milk\nCoffee beans (light roast)\nSourdough\nBasil plant\nPost-it notes\n'),
        ], { kind: 'home' }),
        dir('Documents', [
          dir('Projects', [
            file('canopy-clock', '', { kind: 'project' }),
          ]),
          file('roadmap.md', `# CanopyOS Roadmap

## Now
- [x] Window manager with snapping
- [x] Spotlight + Launchpad
- [ ] Tabs in Finder
- [ ] Split view

## Later
- [ ] Plugin API
- [ ] Cloud sync (opt-in)
- [ ] Multi-monitor canvas
`),
          file('meeting-notes.txt', `Standup — Monday

• Dock magnification now uses a cosine falloff
• Spotlight indexes 400ms after the last keystroke
• Accessibility pass: focus rings, reduced motion, high contrast
• Ship the wallpaper pack on Friday
`),
          file('budget.csv', 'month,income,expenses\nJan,4200,3150\nFeb,4200,2870\nMar,4500,3310\nApr,4500,2980\n'),
        ]),
        dir('Downloads', [
          file('receipt-0042.txt', 'Canopy Coffee Roasters\n4 bags — Ethiopian Guji\nTotal: $64.00\nThank you!\n'),
          file('wallpaper-pack.zip', 'PK\u0003\u0004 (demo archive — CanopyOS does not unpack real zips)', { kind: 'archive' }),
        ]),
        dir('Pictures', [
          dir('Screenshots', [], { kind: 'screenshots' }),
          dir('Wallpapers', [], { kind: 'wallpapers' }),
        ]),
        dir('Music', [
          file('Canopy Theme.mid', 'MIDI placeholder', { kind: 'audio' }),
        ]),
        dir('Movies', []),
        dir('Projects', [
          dir('canopy-clock', [
            file('index.html', '<!doctype html>\n<html>\n<head><title>Canopy Clock</title></head>\n<body>\n  <h1 id="t"></h1>\n  <script>\n    setInterval(() => t.textContent = new Date().toLocaleTimeString(), 1000);\n  </script>\n</body>\n</html>\n'),
            file('styles.css', 'body { display: grid; place-items: center; height: 100vh; font-family: system-ui; }\n'),
            file('README.md', '# Canopy Clock\n\nA tiny clock widget. Open it in the CanopyOS Browser.\n'),
          ]),
          file('ideas.txt', 'A window manager that remembers spatial positions on a canvas.\nAmbient soundscapes generated with WebAudio.\nA collaborative whiteboard built on CRDTs.\n'),
        ]),
        dir('Public', []),
      ], { kind: 'home' }),
      dir('shared', [], { locked: true }),
    ], { kind: 'users' }),
    dir('System', [
      file('version.txt', 'CanopyOS 1.0 "Understory"\nKernel: canopy-js 1.0\nBuilt with vanilla JS, CSS and SVG.\n'),
      file('release-notes.txt', `CanopyOS 1.0

• New window manager with edge snapping and tiling
• Spotlight now answers math, units and dates
• Control Center, Notification Center and Focus modes
• 30+ built-in apps, all original artwork
• Full keyboard navigation pass
`),
    ], { locked: true }),
    dir('Trash', [], { kind: 'trash', locked: true }),
  ]);
}

export function normalize(p) {
  if (!p) return '/';
  const parts = [];
  for (const seg of String(p).split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return '/' + parts.join('/');
}

export function join(base, name) {
  return normalize(base === '/' ? '/' + name : base + '/' + name);
}

export function basename(p) {
  const n = normalize(p);
  return n === '/' ? '/' : n.split('/').pop();
}

export function dirname(p) {
  const n = normalize(p);
  if (n === '/') return '/';
  const parts = n.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function ext(name) {
  const i = (name || '').lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

class FileSystem {
  constructor() {
    this.root = null;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.root = JSON.parse(raw);
      }
    } catch (e) { this.root = null; }
    if (!this.root || this.root.type !== 'folder') this.root = seed();
    this.hydrate(this.root, null);
    this.ensureStandardFolders();
  }

  hydrate(node, parent) {
    Object.defineProperty(node, '_parent', { value: parent, enumerable: false, writable: true, configurable: true });
    if (node.type === 'folder') {
      if (!Array.isArray(node.children)) node.children = [];
      node.children.forEach((c) => this.hydrate(c, node));
    }
  }

  ensureStandardFolders() {
    const needed = [[HOME, 'home'], [HOME + '/Desktop'], [HOME + '/Documents'], [HOME + '/Downloads'], [HOME + '/Pictures'], [HOME + '/Music'], [HOME + '/Projects'], ['/Trash', 'trash']];
    let changed = false;
    for (const [p, kind] of needed) {
      if (!this.stat(p)) {
        const parentPath = dirname(p);
        const parent = this.stat(parentPath);
        if (parent && parent.type === 'folder') {
          const n = dir(p.split('/').pop(), [], kind ? { kind } : {});
          this.hydrate(n, parent);
          parent.children.push(n);
          changed = true;
        }
      }
    }
    if (changed) this.persist();
  }

  persist() {
    if (this._t) clearTimeout(this._t);
    this._t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.root, (k, v) => (k === '_parent' ? undefined : v)));
      } catch (e) {
        console.warn('CanopyOS: could not persist files', e);
      }
    }, 220);
  }

  emit(action, path) {
    window.dispatchEvent(new CustomEvent('canopy:fs', { detail: { action, path } }));
  }

  stat(path) {
    const p = normalize(path);
    if (p === '/') return this.root;
    const parts = p.split('/').filter(Boolean);
    let cur = this.root;
    for (const part of parts) {
      if (!cur || cur.type !== 'folder') return null;
      cur = cur.children.find((c) => c.name === part);
      if (!cur) return null;
    }
    return cur;
  }

  exists(path) { return !!this.stat(path); }

  isDir(path) { const n = this.stat(path); return !!n && n.type === 'folder'; }

  pathOf(node) {
    const parts = [];
    let cur = node;
    while (cur && cur !== this.root) {
      parts.unshift(cur.name);
      cur = cur._parent;
    }
    return '/' + parts.join('/');
  }

  list(path) {
    const n = this.stat(path);
    if (!n || n.type !== 'folder') return [];
    return n.children
      .slice()
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
      .map((c) => ({ node: c, path: this.pathOf(c), name: c.name, type: c.type }));
  }

  read(path) {
    const n = this.stat(path);
    if (!n || n.type !== 'file') return '';
    return n.content || '';
  }

  mkdir(path, opts = {}) {
    const p = normalize(path);
    const existing = this.stat(p);
    if (existing) return existing;
    const parent = this.stat(dirname(p));
    if (!parent || parent.type !== 'folder') throw new Error('No such folder: ' + dirname(p));
    const n = dir(basename(p), [], opts.meta || {});
    this.hydrate(n, parent);
    parent.children.push(n);
    parent.meta.modified = now();
    this.persist();
    this.emit('mkdir', p);
    return n;
  }

  createFile(path, content = '', meta = {}) {
    const p = normalize(path);
    const existing = this.stat(p);
    if (existing) {
      if (existing.type === 'file') { existing.content = content; existing.meta.modified = now(); this.persist(); this.emit('write', p); }
      return existing;
    }
    const parent = this.stat(dirname(p));
    if (!parent || parent.type !== 'folder') throw new Error('No such folder: ' + dirname(p));
    const n = file(basename(p), content, meta);
    this.hydrate(n, parent);
    parent.children.push(n);
    parent.meta.modified = now();
    this.persist();
    this.emit('create', p);
    return n;
  }

  write(path, content) {
    const n = this.stat(path);
    if (!n) return this.createFile(path, content);
    if (n.type !== 'file') return n;
    n.content = content;
    n.meta.modified = now();
    this.persist();
    this.emit('write', path);
    return n;
  }

  rename(path, newName) {
    const n = this.stat(path);
    if (!n || n === this.root) return false;
    const clean = String(newName).trim().replace(/[\\/:*?"<>|]/g, '');
    if (!clean) return false;
    const siblings = n._parent?.children || [];
    if (siblings.some((c) => c !== n && c.name === clean)) throw new Error('An item with that name already exists.');
    n.name = clean;
    n.meta.modified = now();
    this.persist();
    this.emit('rename', this.pathOf(n));
    return true;
  }

  move(path, destDir) {
    const n = this.stat(path);
    const dest = this.stat(destDir);
    if (!n || !dest || dest.type !== 'folder') return false;
    if (n === this.root || n._parent === dest) return false;
    // prevent moving a folder inside itself
    let p = dest;
    while (p) { if (p === n) return false; p = p._parent; }
    const idx = n._parent.children.indexOf(n);
    if (idx >= 0) n._parent.children.splice(idx, 1);
    n._parent = dest;
    dest.children.push(n);
    dest.meta.modified = now();
    this.persist();
    this.emit('move', this.pathOf(n));
    return true;
  }

  copy(path, destDir) {
    const n = this.stat(path);
    const dest = this.stat(destDir);
    if (!n || !dest || dest.type !== 'folder') return false;
    const clone = (src, parent) => {
      const c = JSON.parse(JSON.stringify(src, (k, v) => (k === '_parent' ? undefined : v)));
      if (c.type === 'folder') c.children = src.children.map((ch) => clone(ch, c));
      c.name = src.name;
      this.hydrate(c, parent);
      return c;
    };
    const c = clone(n, dest);
    let base = c.name;
    let i = 2;
    while (dest.children.some((x) => x.name === c.name)) {
      const dot = base.lastIndexOf('.');
      c.name = dot > 0 ? `${base.slice(0, dot)} ${i}${base.slice(dot)}` : `${base} ${i}`;
      i++;
    }
    dest.children.push(c);
    this.persist();
    this.emit('copy', this.pathOf(c));
    return true;
  }

  remove(path, { trash = true } = {}) {
    const n = this.stat(path);
    if (!n || n === this.root) return false;
    const trashNode = this.stat('/Trash');
    if (trash && trashNode && !path.startsWith('/Trash')) {
      const original = path;
      const idx = n._parent.children.indexOf(n);
      if (idx >= 0) n._parent.children.splice(idx, 1);
      n._parent = trashNode;
      n.meta.trashedFrom = original;
      n.meta.trashedAt = now();
      trashNode.children.push(n);
      this.persist();
      this.emit('trash', path);
      return true;
    }
    const idx = n._parent.children.indexOf(n);
    if (idx >= 0) n._parent.children.splice(idx, 1);
    this.persist();
    this.emit('delete', path);
    return true;
  }

  emptyTrash() {
    const t = this.stat('/Trash');
    if (!t) return;
    t.children = [];
    this.persist();
    this.emit('empty-trash', '/Trash');
  }

  restore(path) {
    const n = this.stat(path);
    if (!n || !n.meta?.trashedFrom) return false;
    const dest = this.stat(dirname(n.meta.trashedFrom)) || this.stat(HOME);
    return this.move(path, this.pathOf(dest));
  }

  search(query, opts = {}) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    const out = [];
    const walk = (node) => {
      const p = this.pathOf(node);
      if (node !== this.root && !p.startsWith('/Trash')) {
        const hay = node.name.toLowerCase() + ' ' + (node.type === 'file' ? (node.content || '').slice(0, 400).toLowerCase() : '');
        if (hay.includes(q)) out.push({ node, path: p });
      }
      if (node.type === 'folder' && opts.depth !== 'shallow') node.children.forEach(walk);
    };
    walk(this.root);
    return out.slice(0, 120);
  }

  /** Recursively collect tags used in the tree. */
  tags() {
    const set = new Set();
    const walk = (n) => {
      (n.meta?.tags || []).forEach((t) => set.add(t));
      if (n.type === 'folder') n.children.forEach(walk);
    };
    walk(this.root);
    return [...set];
  }

  stats() {
    let files = 0; let folders = 0; let bytes = 0;
    const walk = (n) => {
      if (n.type === 'folder') { folders++; n.children.forEach(walk); }
      else { files++; bytes += (n.content || '').length; }
    };
    walk(this.root);
    return { files, folders, bytes };
  }

  reset() {
    this.root = seed();
    this.hydrate(this.root, null);
    this.persist();
    this.emit('reset', '/');
  }
}

export const fs = new FileSystem();
window.CanopyFS = fs;
