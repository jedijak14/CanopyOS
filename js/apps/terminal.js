/* CanopyOS — Terminal with a real virtual shell */
import { fs, HOME, normalize, basename, join } from '../core/fs.js';
import { store } from '../core/store.js';
import { wm } from '../core/wm.js';
import { sound } from '../core/sound.js';
import { openPath } from '../core/open.js';
import { escapeHtml, formatBytes, fmtTime, fmtDate } from '../core/util.js';
import { getWeather } from '../core/weather.js';
import { quote } from '../core/stocks.js';
import { notify } from '../core/notify.js';
import { data } from '../core/data.js';

const BANNER = `
<span class="t-green">   ______                        </span>
<span class="t-green">  / ____/___  ____  ____  ____  __</span>
<span class="t-green"> / /   / __ \\/ __ \\/ __ \\/ __ \\/ /</span>
<span class="t-green">/ /___/ /_/ / / / / /_/ / /_/ / / </span>
<span class="t-green">\\____/\\____/_/ /_/\\____/\\____/_/  </span>
<span class="t-dim">CanopyOS 1.0 "Understory" — type</span> <span class="t-cyan">help</span> <span class="t-dim">to begin.</span>
`;

const FORTUNES = [
  'A canopy is just a hundred trees agreeing to share the light.',
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  'Simplicity is prerequisite for reliability. — Edsger Dijkstra',
  'Talk is cheap. Show me the code. — Linus Torvalds',
  'Make it work, make it right, make it fast.',
  'Every interface is a conversation. Be polite.',
  'The fern does not hurry, yet everything is accomplished.',
  'You are one commit away from a better day.',
];

export default {
  id: 'terminal',
  name: 'Terminal',
  icon: 'terminal',
  colors: ['#4b5563', '#111827'],
  width: 760,
  height: 470,
  keywords: ['shell', 'console', 'command', 'bash', 'zsh'],
  menus: () => [
    { label: 'Shell', items: [
      { label: 'New Window', shortcut: '⌘N', action: () => wm.open('terminal') },
      { label: 'Clear Buffer', shortcut: '⌘K', action: () => window.dispatchEvent(new CustomEvent('canopy:term-clear')) },
      { sep: true },
      { label: 'Close', shortcut: '⌘W', action: () => wm.closeApp('terminal') },
    ] },
    { label: 'Edit', items: [
      { label: 'Copy', shortcut: '⌘C', action: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: '⌘V', action: () => document.execCommand('paste') },
    ] },
    { label: 'View', items: [
      { label: 'Bigger Text', action: () => window.dispatchEvent(new CustomEvent('canopy:term-font', { detail: 1 })) },
      { label: 'Smaller Text', action: () => window.dispatchEvent(new CustomEvent('canopy:term-font', { detail: -1 })) },
    ] },
  ],

  mount({ root, win, args }) {
    let cwd = args?.cwd && fs.exists(args.cwd) ? args.cwd : HOME;
    let history = [];
    let hIndex = -1;
    let buffer = '';
    let fontSize = 12.5;
    const user = 'canopy';
    const host = 'canopy';

    root.innerHTML = `<div class="term">
      <div class="term-out scroll-thin" tabindex="0"></div>
      <div class="term-line">
        <span class="term-prompt"></span>
        <input class="term-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input" />
      </div>
    </div>`;

    const out = root.querySelector('.term-out');
    const input = root.querySelector('.term-input');
    const promptEl = root.querySelector('.term-prompt');

    const print = (html, cls = '') => {
      const line = document.createElement('div');
      line.className = 'term-row ' + cls;
      line.innerHTML = html;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    };
    const promptText = () => `${user}@${host}:${cwd === HOME ? '~' : cwd.replace(HOME, '~')}$ `;
    const setPrompt = () => { promptEl.textContent = promptText(); };
    const setFont = (n) => {
      fontSize = Math.max(9, Math.min(20, n));
      out.style.fontSize = `${fontSize}px`;
      input.style.fontSize = `${fontSize}px`;
    };

    const resolve = (p) => {
      if (!p) return cwd;
      if (p === '~') return HOME;
      if (p.startsWith('~/')) return normalize(HOME + '/' + p.slice(2));
      return p.startsWith('/') ? normalize(p) : normalize(cwd + '/' + p);
    };

    const listDir = (p) => fs.list(p);

    function printListing(path, { long = false, all = false } = {}) {
      const items = listDir(path).filter((i) => all || !i.name.startsWith('.'));
      if (!items.length) { print('<span class="t-dim">(empty)</span>'); return; }
      if (long) {
        print('<span class="t-dim">total ' + items.length + '</span>');
        items.forEach((it) => {
          const size = it.type === 'folder' ? 4096 : (it.node.content || '').length;
          print(`<span class="t-dim">${it.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--'}  ${user}  staff  ${String(size).padStart(7)}  ${new Date(it.node.meta.modified).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}  ${new Date(it.node.meta.modified).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} </span><span class="${it.type === 'folder' ? 't-blue' : ''}">${escapeHtml(it.name)}</span>`);
        });
      } else {
        print(items.map((it) => `<span class="${it.type === 'folder' ? 't-blue' : 't-fg'}">${escapeHtml(it.name)}${''}</span>`).join('   '));
      }
    }

    const COMMANDS = {
      help() {
        print(`<span class="t-green">CanopyOS shell — available commands</span>
<span class="t-cyan">Files</span>      ls, cd, pwd, cat, touch, mkdir, rm, rmdir, mv, cp, tree, find, du, open, edit, wc, head, tail, grep
<span class="t-cyan">System</span>     whoami, hostname, uname, date, uptime, df, ps, neofetch, theme, wallpaper, notify, say, clear, history, exit
<span class="t-cyan">Fun</span>        fortune, cowsay, banner, matrix, weather, stock, calc, joke
<span class="t-cyan">Tips</span>       Tab completes · ↑/↓ history · Ctrl+L clears · Ctrl+C cancels`);
      },
      ls(args) {
        const flags = args.filter((a) => a.startsWith('-')).join('');
        const target = args.find((a) => !a.startsWith('-')) || cwd;
        const p = resolve(target);
        if (!fs.exists(p)) return print(`<span class="t-red">ls: ${escapeHtml(target)}: No such file or directory</span>`);
        if (fs.stat(p).type === 'file') return print(escapeHtml(basename(p)));
        printListing(p, { long: flags.includes('l'), all: flags.includes('a') });
      },
      cd(args) {
        const p = resolve(args[0] || '~');
        if (!fs.exists(p)) return print(`<span class="t-red">cd: no such file or directory: ${escapeHtml(args[0] || '')}</span>`);
        if (fs.stat(p).type !== 'folder') return print(`<span class="t-red">cd: not a directory: ${escapeHtml(args[0])}</span>`);
        cwd = p;
        setPrompt();
      },
      pwd() { print(escapeHtml(cwd)); },
      cat(args) {
        if (!args[0]) return print('<span class="t-red">cat: missing file operand</span>');
        const p = resolve(args[0]);
        const n = fs.stat(p);
        if (!n) return print(`<span class="t-red">cat: ${escapeHtml(args[0])}: No such file or directory</span>`);
        if (n.type === 'folder') return print(`<span class="t-red">cat: ${escapeHtml(args[0])}: Is a directory</span>`);
        print(`<pre class="term-pre selectable">${escapeHtml(n.content || '')}</pre>`);
      },
      touch(args) {
        if (!args[0]) return print('<span class="t-red">touch: missing file operand</span>');
        const p = resolve(args[0]);
        if (!fs.exists(p)) fs.createFile(p, '');
        print(`<span class="t-dim">created ${escapeHtml(p)}</span>`);
      },
      mkdir(args) {
        if (!args[0]) return print('<span class="t-red">mkdir: missing operand</span>');
        try { fs.mkdir(resolve(args[0])); print(`<span class="t-dim">created directory ${escapeHtml(args[0])}</span>`); }
        catch (e) { print(`<span class="t-red">mkdir: ${escapeHtml(e.message)}</span>`); }
      },
      rm(args) {
        const targets = args.filter((a) => !a.startsWith('-'));
        if (!targets.length) return print('<span class="t-red">rm: missing operand</span>');
        targets.forEach((t) => {
          const p = resolve(t);
          if (!fs.exists(p)) return print(`<span class="t-red">rm: ${escapeHtml(t)}: No such file or directory</span>`);
          fs.remove(p, { trash: false });
          print(`<span class="t-dim">removed ${escapeHtml(t)}</span>`);
        });
      },
      rmdir(args) {
        const p = resolve(args[0]);
        const n = fs.stat(p);
        if (!n) return print(`<span class="t-red">rmdir: ${escapeHtml(args[0])}: No such file or directory</span>`);
        if (n.type !== 'folder' || n.children.length) return print('<span class="t-red">rmdir: Directory not empty</span>');
        fs.remove(p, { trash: false });
        print(`<span class="t-dim">removed ${escapeHtml(args[0])}</span>`);
      },
      mv(args) {
        if (args.length < 2) return print('<span class="t-red">mv: missing destination</span>');
        const src = resolve(args[0]);
        const dest = resolve(args[1]);
        if (!fs.exists(src)) return print(`<span class="t-red">mv: ${escapeHtml(args[0])}: No such file or directory</span>`);
        if (fs.isDir(dest)) fs.move(src, dest);
        else {
          const node = fs.stat(src);
          if (node.type === 'folder') return print('<span class="t-red">mv: cannot rename folders here</span>');
          fs.createFile(dest, node.content || '');
          fs.remove(src, { trash: false });
        }
        print(`<span class="t-dim">moved ${escapeHtml(args[0])} → ${escapeHtml(args[1])}</span>`);
      },
      cp(args) {
        if (args.length < 2) return print('<span class="t-red">cp: missing destination</span>');
        const src = resolve(args[0]);
        const dest = resolve(args[1]);
        if (!fs.exists(src)) return print(`<span class="t-red">cp: ${escapeHtml(args[0])}: No such file or directory</span>`);
        if (fs.isDir(dest)) fs.copy(src, dest);
        else { const n = fs.stat(src); if (n.type === 'file') fs.createFile(dest, n.content || ''); }
        print(`<span class="t-dim">copied ${escapeHtml(args[0])} → ${escapeHtml(args[1])}</span>`);
      },
      tree(args) {
        const base = resolve(args[0] || '.');
        if (!fs.exists(base)) return print('<span class="t-red">tree: no such directory</span>');
        const lines = [escapeHtml(base)];
        const walk = (path, prefix, depth) => {
          if (depth > 4) return;
          const items = fs.list(path);
          items.forEach((it, i) => {
            const last = i === items.length - 1;
            lines.push(`${prefix}${last ? '└── ' : '├── '}<span class="${it.type === 'folder' ? 't-blue' : ''}">${escapeHtml(it.name)}</span>`);
            if (it.type === 'folder') walk(it.path, prefix + (last ? '    ' : '│   '), depth + 1);
          });
        };
        walk(base, '', 0);
        print(`<pre class="term-pre">${lines.join('\n')}</pre>`);
      },
      find(args) {
        const q = args.join(' ');
        if (!q) return print('<span class="t-red">find: missing pattern</span>');
        const results = fs.search(q).filter((r) => r.path.startsWith(cwd));
        if (!results.length) return print('<span class="t-dim">no matches</span>');
        results.forEach((r) => print(`<span class="t-blue">${escapeHtml(r.path)}</span>`));
      },
      grep(args) {
        if (args.length < 2) return print('<span class="t-red">usage: grep pattern file…</span>');
        const [pat, ...files] = args;
        files.forEach((f) => {
          const p = resolve(f);
          const n = fs.stat(p);
          if (!n || n.type !== 'file') return print(`<span class="t-red">grep: ${escapeHtml(f)}: No such file</span>`);
          const re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          (n.content || '').split('\n').forEach((line, i) => {
            if (re.test(line)) print(`<span class="t-purple">${escapeHtml(f)}:${i + 1}</span> ${escapeHtml(line)}`);
          });
        });
      },
      wc(args) {
        const p = resolve(args[0]);
        const n = fs.stat(p);
        if (!n || n.type !== 'file') return print('<span class="t-red">wc: no such file</span>');
        const text = n.content || '';
        print(`<span class="t-dim">${text.split('\n').length} lines · ${text.split(/\s+/).filter(Boolean).length} words · ${text.length} chars</span>`);
      },
      head(args) {
        const p = resolve(args.find((a) => !a.startsWith('-')) || '');
        const n = fs.stat(p);
        if (!n || n.type !== 'file') return print('<span class="t-red">head: no such file</span>');
        print(`<pre class="term-pre">${escapeHtml((n.content || '').split('\n').slice(0, 10).join('\n'))}</pre>`);
      },
      tail(args) {
        const p = resolve(args.find((a) => !a.startsWith('-')) || '');
        const n = fs.stat(p);
        if (!n || n.type !== 'file') return print('<span class="t-red">tail: no such file</span>');
        print(`<pre class="term-pre">${escapeHtml((n.content || '').split('\n').slice(-10).join('\n'))}</pre>`);
      },
      open(args) {
        if (!args[0]) return print('<span class="t-red">open: missing file</span>');
        const p = resolve(args[0]);
        if (!fs.exists(p)) return print(`<span class="t-red">open: ${escapeHtml(args[0])}: No such file or directory</span>`);
        openPath(p);
        print(`<span class="t-dim">opened ${escapeHtml(p)}</span>`);
      },
      edit(args) {
        const p = resolve(args[0] || '');
        if (!args[0]) return print('<span class="t-red">edit: missing file</span>');
        if (!fs.exists(p)) fs.createFile(p, '');
        wm.open('textedit', { args: { path: p } });
      },
      pwd2() {},
      whoami() { print(user); },
      hostname() { print('canopy.local'); },
      uname() { print('CanopyOS canopy.local 1.0 canopy-js arm64'); },
      date() { print(fmtDate(new Date(), { year: true }) + ' ' + fmtTime(new Date(), { seconds: true, h24: store.get('clock24') })); },
      uptime() {
        const mins = Math.floor(performance.now() / 60000);
        print(`up ${Math.floor(mins / 60)}h ${mins % 60}m, 2 users, load averages: 0.42 0.38 0.31`);
      },
      df() {
        const stats = fs.stats();
        print(`<span class="t-dim">Filesystem      Size   Used  Avail  Capacity  Mounted on</span>
/dev/canopy     512G  ${formatBytes(stats.bytes * 8).padStart(5)}   ~512G    1%      /
localStorage    5.0M  ${formatBytes(JSON.stringify(localStorage).length).padStart(5)}   4.9M    <span class="t-green">11%</span>      /System/Storage`);
      },
      du(args) {
        const p = resolve(args[0] || '.');
        const n = fs.stat(p);
        if (!n) return print('<span class="t-red">du: no such directory</span>');
        let bytes = 0;
        const walk = (x) => { if (x.type === 'file') bytes += (x.content || '').length; else x.children.forEach(walk); };
        walk(n);
        print(`<span class="t-dim">${formatBytes(bytes)}</span>  ${escapeHtml(p)}`);
      },
      ps() {
        print(`<span class="t-dim">  PID  TTY      TIME  COMMAND</span>
    1  console  0:01  canopy-init
   42  console  0:04  window-server
   88  tty1     0:00  canopy-finder
   ${120 + wm.wins.size}  tty1     0:00  canopy-terminal
  201  console  0:12  ambient-audio`);
      },
      neofetch() {
        const stats = fs.stats();
        print(`<div class="neofetch"><pre class="t-green">   ______
  / ____/___  ____  ____  ____  __
 / /   / __ \\/ __ \\/ __ \\/ __ \\/ /
/ /___/ /_/ / / / / /_/ / /_/ / /
\\____/\\____/_/ /_/\\____/\\____/_/</pre>
<div class="t-fg"><b>canopy</b>@<b>canopy.local</b>
<span class="t-dim">-----------------------------</span>
<b>OS</b>        CanopyOS 1.0 "Understory"
<b>Kernel</b>    canopy-js 1.0
<b>Shell</b>     canopy-sh
<b>Resolution</b> ${window.innerWidth}x${window.innerHeight}
<b>WM</b>        Canopy Window Server
<b>Theme</b>     ${store.effectiveTheme()} · accent ${store.get('accent')}
<b>CPU</b>       Virtual ${navigator.hardwareConcurrency || 4}-core
<b>Memory</b>    ${(navigator.deviceMemory || 8)} GB
<b>Storage</b>   ${stats.files} files, ${stats.folders} folders
<b>Uptime</b>    ${Math.floor(performance.now() / 60000)}m</div></div>`);
      },
      theme(args) {
        const t = args[0];
        if (!['light', 'dark', 'auto'].includes(t)) return print('<span class="t-red">usage: theme light|dark|auto</span>');
        store.set('theme', t);
        print(`<span class="t-green">theme set to ${t}</span>`);
      },
      wallpaper(args) {
        const names = ['canopy', 'aurora', 'sunset', 'ocean', 'graphite', 'bloom', 'forest', 'mono'];
        if (!names.includes(args[0])) return print(`<span class="t-dim">available: ${names.join(', ')}</span>`);
        store.set('wallpaper', args[0]);
        print(`<span class="t-green">wallpaper set to ${args[0]}</span>`);
      },
      notify(args) {
        const msg = args.join(' ') || 'Hello from Terminal';
        notify.post({ title: 'Terminal', body: msg, app: 'Terminal', appId: 'terminal', icon: 'terminal', colors: ['#4b5563', '#111827'] });
        print('<span class="t-dim">notification sent</span>');
      },
      say(args) {
        const text = args.join(' ') || 'Hello, I am CanopyOS.';
        if (!window.speechSynthesis) return print('<span class="t-red">say: speech synthesis unavailable</span>');
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        window.speechSynthesis.speak(utter);
        print(`<span class="t-dim">🗣 ${escapeHtml(text)}</span>`);
      },
      clear() { out.innerHTML = ''; },
      history() {
        history.forEach((h, i) => print(`<span class="t-dim">${String(i + 1).padStart(3)}</span>  ${escapeHtml(h)}`));
      },
      exit() { win.close(); },
      fortune() { print(`<span class="t-ylw">${escapeHtml(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])}</span>`); },
      cowsay(args) {
        const msg = args.join(' ') || 'Moo.';
        const line = '─'.repeat(msg.length + 2);
        print(`<pre class="term-pre"> ┌${line}┐
 │ ${escapeHtml(msg)} │
 └${line}┘
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</pre>`);
      },
      banner(args) {
        const word = (args.join(' ') || 'CANOPY').toUpperCase().slice(0, 12);
        print(`<pre class="term-pre t-green" style="font-size:14px;letter-spacing:3px">╔═╗ ${escapeHtml(word)} ╔═╗</pre>`);
      },
      matrix() {
        for (let i = 0; i < 6; i++) {
          const chars = Array.from({ length: 60 }, () => '01アイウエオカキクケコ'[Math.floor(Math.random() * 12)]).join('');
          print(`<span class="t-green" style="opacity:${(1 - i / 7).toFixed(2)}">${chars}</span>`);
        }
      },
      calc(args) {
        const expr = args.join(' ');
        if (!/^[\d\s.+\-*/^%()]+$/.test(expr)) return print('<span class="t-red">calc: invalid expression</span>');
        try {
          // eslint-disable-next-line no-new-func
          const val = Function(`"use strict";return (${expr.replace(/\^/g, '**')})`)();
          print(`<span class="t-cyan">${escapeHtml(expr)}</span> = <b>${Number(val.toFixed(8))}</b>`);
        } catch (e) { print('<span class="t-red">calc: could not parse expression</span>'); }
      },
      weather(args) {
        const w = getWeather(args.join(' ') || data.get('weatherCity', 'San Diego'));
        print(`<span class="t-cyan">${w.city.name}</span>  ${w.temp}°  ${w.condition.label}  H:${w.high}° L:${w.low}°  humidity ${w.humidity}%  wind ${w.wind} km/h`);
      },
      stock(args) {
        const q = quote((args[0] || 'CNPY').toUpperCase());
        if (!q) return print('<span class="t-red">stock: unknown symbol</span>');
        const color = q.change >= 0 ? 't-green' : 't-red';
        print(`<span class="t-cyan">${q.sym}</span>  ${q.name}  $${q.price.toFixed(2)}  <span class="${color}">${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.pct.toFixed(2)}%)</span>`);
      },
      joke() {
        const jokes = ['Why do programmers prefer dark mode? Because light attracts bugs.', 'There are 10 types of people: those who understand binary and those who don\'t.', 'A SQL query walks into a bar, approaches two tables and asks: may I join you?'];
        print(escapeHtml(jokes[Math.floor(Math.random() * jokes.length)]));
      },
      sudo() { print('<span class="t-ylw">canopy is not in the sudoers file. This incident has been logged. 🌿</span>'); },
      man(args) {
        const cmd = args[0];
        if (cmd && COMMANDS[cmd]) print(`<b class="t-cyan">${cmd}</b>\n<span class="t-dim">CanopyOS built-in command. Type “help” for the full list.</span>`);
        else print(`<span class="t-dim">What manual page do you want? Try: man ls</span>`);
      },
    };

    function execute(raw) {
      const line = raw.trim();
      print(`<span class="term-echo"><span class="t-dim">${escapeHtml(promptText())}</span>${escapeHtml(line)}</span>`);
      if (!line) return;
      history.push(line);
      hIndex = history.length;
      const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const cmd = parts[0];
      const args = parts.slice(1).map((a) => a.replace(/^"|"$/g, ''));
      if (COMMANDS[cmd]) {
        try { COMMANDS[cmd](args); } catch (e) { print(`<span class="t-red">${escapeHtml(cmd)}: ${escapeHtml(e.message)}</span>`); }
      } else if (cmd === 'echo') {
        print(escapeHtml(args.join(' ')));
      } else if (cmd === 'grep') {
        COMMANDS.grep(args);
      } else {
        print(`<span class="t-red">canopy-sh: command not found: ${escapeHtml(cmd)}</span> <span class="t-dim">— try “help”</span>`);
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        buffer = input.value;
        input.value = '';
        execute(buffer);
        sound.play('type');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIndex > 0) { hIndex--; input.value = history[hIndex] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex] || ''; }
        else { hIndex = history.length; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const value = input.value;
        const parts = value.split(' ');
        const last = parts[parts.length - 1];
        if (parts.length === 1) {
          const matches = Object.keys(COMMANDS).filter((c) => c.startsWith(last));
          if (matches.length === 1) input.value = matches[0] + ' ';
          else if (matches.length > 1) print(`<span class="t-dim">${matches.join('   ')}</span>`);
        } else {
          const dirPart = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '';
          const base = last.slice(dirPart.length);
          const p = resolve(dirPart || '.');
          if (fs.isDir(p)) {
            const matches = fs.list(p).filter((i) => i.name.startsWith(base));
            if (matches.length === 1) input.value = parts.slice(0, -1).join(' ') + ' ' + dirPart + matches[0].name + (matches[0].type === 'folder' ? '/' : '');
            else if (matches.length > 1) print(`<span class="t-dim">${matches.map((m) => m.name).join('   ')}</span>`);
          }
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        out.innerHTML = '';
      } else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        print(`<span class="t-dim">${escapeHtml(promptText())}</span>^C`);
        input.value = '';
      }
    });

    root.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('input')) setTimeout(() => input.focus(), 0);
    });

    const clearHandler = () => { out.innerHTML = ''; };
    const fontHandler = (e) => setFont(fontSize + e.detail);
    window.addEventListener('canopy:term-clear', clearHandler);
    window.addEventListener('canopy:term-font', fontHandler);
    win.onClose(() => {
      window.removeEventListener('canopy:term-clear', clearHandler);
      window.removeEventListener('canopy:term-font', fontHandler);
    });

    out.innerHTML = BANNER;
    setPrompt();
    setTimeout(() => input.focus(), 120);
    if (args?.command) execute(args.command);
  },
};
