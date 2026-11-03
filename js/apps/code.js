/* CanopyOS — Code editor with syntax highlighting and live preview */
import { fs, HOME, dirname, basename, ext, join } from '../core/fs.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, debounce } from '../core/util.js';
import { promptModal, alertModal } from '../ui/modal.js';

const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|class|extends|new|import|export|from|default|async|await|try|catch|throw|this|super|null|undefined|true|false|typeof|instanceof|switch|case|break|continue|do|in|of|delete|void|yield|static|get|set)\b/g;

function highlight(code, language) {
  let html = escapeHtml(code);
  const store = [];
  const stash = (str) => { store.push(str); return `\u0000${store.length - 1}\u0000`; };

  html = html.replace(/&lt;!--[\s\S]*?--&gt;/g, (m) => stash(`<span class="tok-comment">${m}</span>`));
  html = html.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, (m) => stash(`<span class="tok-comment">${m}</span>`));
  html = html.replace(/("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g, (m) => stash(`<span class="tok-string">${m}</span>`));
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, (m) => stash(`<span class="tok-num">${m}</span>`));
  if (language === 'js' || language === 'json') html = html.replace(KEYWORDS, (m) => stash(`<span class="tok-key">${m}</span>`));
  if (language === 'css') {
    html = html.replace(/^([^{}\n]+)(?=\{)/gm, (m) => stash(`<span class="tok-sel">${m}</span>`));
    html = html.replace(/([\w-]+)(\s*:)/g, (m, p1, p2) => stash(`<span class="tok-prop">${p1}</span>${p2}`));
  }
  if (language === 'html') {
    html = html.replace(/(&lt;\/?)([\w-]+)/g, (m, p1, p2) => `${p1}${stash(`<span class="tok-tag">${p2}</span>`)}`);
    html = html.replace(/([\w-]+)=/g, (m, p1) => `${stash(`<span class="tok-attr">${p1}</span>`)}=`);
  }
  html = html.replace(/\u0000(\d+)\u0000/g, (m, i) => store[Number(i)]);
  return html;
}

export default {
  id: 'code',
  name: 'Code',
  icon: 'code',
  colors: ['#2f3b4a', '#131a22'],
  width: 1000, height: 660,
  keywords: ['editor', 'programming', 'developer', 'javascript', 'html'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'New File', shortcut: '⌘N', action: () => win?._newFile() },
      { label: 'Save', shortcut: '⌘S', action: () => win?._save() },
      { label: 'Open Folder', action: () => wm.open('finder', { args: { path: `${HOME}/Projects` } }) },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => win?.close() },
    ] },
    { label: 'Run', items: [
      { label: 'Preview', shortcut: '⌘R', action: () => win?._run() },
      { label: 'Reload Preview', action: () => win?._run() },
      { sep: true },
      { label: 'Open in Browser', action: () => win?._run(true) },
    ] },
  ],

  mount({ root, toolbar, win, args }) {
    let openPath = args?.path && fs.exists(args.path) ? args.path : null;
    let content = openPath ? fs.read(openPath) : '';
    let dirty = false;
    let preview = false;
    let expanded = new Set([`${HOME}/Projects`]);

    root.innerHTML = `<div class="code">
      <aside class="code-side">
        <div class="code-side-head"><b>Projects</b><button class="icon-btn" data-new title="New file">${glyph('plus', 12, 2.2)}</button></div>
        <div class="code-tree" data-tree></div>
      </aside>
      <section class="code-main">
        <div class="code-tabs"><div class="code-tab active" data-tab></div></div>
        <div class="code-body">
          <div class="code-editor">
            <div class="code-gutter" data-gutter></div>
            <div class="code-area">
              <pre class="code-highlight" data-highlight aria-hidden="true"></pre>
              <textarea class="code-input" spellcheck="false" data-input aria-label="Code editor"></textarea>
            </div>
          </div>
          <div class="code-preview" data-previewwrap hidden>
            <div class="code-preview-head"><b>Preview</b><span class="spacer"></span><button class="btn small" data-reload>Reload</button><button class="icon-btn" data-closeprev>${glyph('close', 12, 2.2)}</button></div>
            <iframe data-iframe sandbox="allow-scripts allow-forms allow-modals" title="Code preview"></iframe>
          </div>
        </div>
        <div class="code-status"><span data-file>Untitled</span><span>·</span><span data-lang>Plain Text</span><span class="spacer"></span><span data-pos>Ln 1, Col 1</span><span data-saved>Saved</span></div>
      </section>
    </div>`;

    const treeEl = root.querySelector('[data-tree]');
    const input = root.querySelector('[data-input]');
    const highlightEl = root.querySelector('[data-highlight]');
    const gutter = root.querySelector('[data-gutter]');
    const previewWrap = root.querySelector('[data-previewwrap]');
    const iframe = root.querySelector('[data-iframe]');

    function renderTree() {
      const build = (path, depth = 0) => {
        const items = fs.list(path);
        return items.map((it) => {
          const isOpen = expanded.has(it.path);
          return `<div class="code-node" style="padding-left:${8 + depth * 12}px" data-path="${it.path}" data-type="${it.type}">
            ${it.type === 'folder' ? `<span class="code-caret">${isOpen ? '▾' : '▸'}</span>` : '<span class="code-caret"></span>'}
            ${glyph(it.type === 'folder' ? (isOpen ? 'folderOpen' : 'folder') : 'file', 13, 1.8)}
            <span class="code-node-name">${escapeHtml(it.name)}</span>
          </div>${it.type === 'folder' && isOpen ? build(it.path, depth + 1) : ''}`;
        }).join('');
      };
      treeEl.innerHTML = build(`${HOME}/Projects`) || '<div class="tiny muted" style="padding:12px">No projects</div>';
      treeEl.querySelectorAll('[data-path]').forEach((n) => n.addEventListener('click', () => {
        const p = n.dataset.path;
        if (n.dataset.type === 'folder') {
          if (expanded.has(p)) expanded.delete(p); else expanded.add(p);
          renderTree();
        } else {
          openFile(p);
        }
      }));
    }

    function langFor(path) {
      const e = ext(path || '');
      return { js: 'js', mjs: 'js', json: 'json', css: 'css', html: 'html', htm: 'html', md: 'md', py: 'py', sh: 'sh' }[e] || 'text';
    }
    const LANG_LABEL = { js: 'JavaScript', json: 'JSON', css: 'CSS', html: 'HTML', md: 'Markdown', py: 'Python', sh: 'Shell', text: 'Plain Text' };

    function openFile(path) {
      if (dirty) save(true);
      openPath = path;
      content = fs.read(path);
      dirty = false;
      render();
      sound.play('click');
    }

    function render() {
      input.value = content;
      highlightEl.innerHTML = highlight(content, langFor(openPath)) + '\n';
      const lines = content.split('\n').length;
      gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<span>${i + 1}</span>`).join('');
      root.querySelector('[data-lang]').textContent = LANG_LABEL[langFor(openPath)];
      root.querySelector('[data-file]').textContent = openPath ? basename(openPath) : 'Untitled';
      root.querySelector('[data-saved]').textContent = dirty ? 'Edited' : 'Saved';
      root.querySelector('[data-tab]').innerHTML = `${glyph('file', 12, 2)} ${escapeHtml(openPath ? basename(openPath) : 'Untitled')}${dirty ? ' •' : ''}`;
      win.setTitle(`${openPath ? basename(openPath) : 'Untitled'} — Code`);
      if (openPath && preview) run();
    }

    function save(silent) {
      if (!openPath) { win._newFile(); return; }
      fs.write(openPath, content);
      dirty = false;
      render();
      if (!silent) sound.play('success');
    }

    const sync = () => {
      highlightEl.innerHTML = highlight(content, langFor(openPath)) + '\n';
      highlightEl.scrollTop = input.scrollTop;
      highlightEl.scrollLeft = input.scrollLeft;
      const before = content.slice(0, input.selectionStart);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');
      root.querySelector('[data-pos]').textContent = `Ln ${line}, Col ${col}`;
      gutter.scrollTop = input.scrollTop;
    };

    input.addEventListener('scroll', sync);
    input.addEventListener('input', () => {
      content = input.value;
      dirty = true;
      render();
      sync();
      if (preview) debouncedRun();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = input.selectionStart;
        input.value = `${input.value.slice(0, s)}  ${input.value.slice(input.selectionEnd)}`;
        input.selectionStart = input.selectionEnd = s + 2;
        content = input.value;
        dirty = true;
        render();
        sync();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
    });

    function stringify(v) {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        try { return JSON.stringify(v); } catch { return String(v); }
      }
      return String(v);
    }

    function previewHtml() {
      const lang = langFor(openPath);
      const shell = (body, extraHead = '') => `<!doctype html><html><head><meta charset="utf-8">${extraHead}`
        + '<style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px;background:#0e1116;color:#e6edf3;line-height:1.6}'
        + 'a{color:#6cb6ff}pre{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;margin:0}</style>'
        + `</head><body>${body}</body></html>`;

      if (lang === 'html') return content;

      if (lang === 'css') {
        return shell(`<style>${content}</style><h1>Canopy</h1>`
          + '<p>CSS preview — a paragraph with <a href="#">a link</a> and a <button>button</button>.</p>'
          + '<p><small>Your stylesheet is applied above.</small></p>');
      }
      if (lang === 'md') {
        return shell(`<pre>${escapeHtml(content)}</pre>`);
      }
      if (lang === 'js') {
        // Escape closing script tags so the sandboxed document stays intact.
        const src = content.replace(/<\/script>/gi, '<\\/script>');
        const runner = [
          '<pre id="out">Running…</pre>',
          '<script>',
          '(() => {',
          '  const out = document.getElementById("out");',
          '  const logs = [];',
          '  const write = () => { out.textContent = logs.length ? logs.join("\\n") : "(no output)"; };',
          '  const fmt = (v) => { try { return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v); } catch (e) { return String(v); } };',
          '  ["log", "info", "warn", "error", "debug"].forEach((k) => {',
          '    console[k] = (...a) => { logs.push(a.map(fmt).join(" ")); write(); };',
          '  });',
          '  window.addEventListener("error", (e) => { logs.push("Error: " + e.message); write(); });',
          '  try {',
          src,
          '  } catch (e) { logs.push("Error: " + (e && e.message ? e.message : e)); }',
          '  write();',
          '})();',
          '<\/script>',
        ].join('\n');
        return shell(runner);
      }
      return shell(`<pre>${escapeHtml(content)}</pre>`);
    }

    function run(openInBrowser) {
      const html = previewHtml();
      if (openInBrowser) {
        fs.createFile(`${HOME}/Projects/preview.html`, html);
        wm.open('browser', { args: { url: `file://${HOME}/Projects/preview.html` } });
        return;
      }
      preview = true;
      previewWrap.hidden = false;
      iframe.srcdoc = html;
      sound.play('pop');
    }
    const debouncedRun = debounce(() => { if (preview) run(); }, 700);

    win._run = (inBrowser) => run(inBrowser);
    win._save = () => save();
    win._newFile = async () => {
      const name = await promptModal({ title: 'New File', label: `Create in ${openPath ? dirname(openPath) : `${HOME}/Projects`}`, value: 'untitled.js', okLabel: 'Create' });
      if (!name) return;
      const dir = openPath ? dirname(openPath) : `${HOME}/Projects`;
      const p = join(dir, name);
      if (fs.exists(p)) { alertModal({ title: 'File exists', body: 'Choose another name.', art: 'warning' }); return; }
      fs.createFile(p, '');
      expanded.add(dir);
      renderTree();
      openFile(p);
    };

    root.querySelector('[data-new]').addEventListener('click', () => win._newFile());
    root.querySelector('[data-reload]').addEventListener('click', () => run());
    root.querySelector('[data-closeprev]').addEventListener('click', () => {
      preview = false;
      previewWrap.hidden = true;
      iframe.srcdoc = '';
    });

    toolbar.innerHTML = `<span class="fn-toolbar-title">${openPath ? escapeHtml(basename(openPath)) : 'Code'}</span><span class="spacer"></span>
      <button class="btn small no-drag" data-save2>${glyph('download', 11, 2)} Save</button>
      <button class="btn small primary no-drag" data-run>${glyph('play', 10, 2.4)} Run</button>`;
    toolbar.querySelector('[data-save2]').addEventListener('click', () => save());
    toolbar.querySelector('[data-run]').addEventListener('click', () => run());

    win.onClose(() => { if (dirty && openPath) fs.write(openPath, content); });
    renderTree();
    if (!openPath) {
      const first = fs.search('.')[0];
      const defaultFile = `${HOME}/Projects/canopy-clock/index.html`;
      if (fs.exists(defaultFile)) openFile(defaultFile);
    } else {
      render();
    }
  },
};
