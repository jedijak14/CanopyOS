/* CanopyOS — Activity Monitor */
import { wm, allApps } from '../core/wm.js';
import { fs } from '../core/fs.js';
import { store } from '../core/store.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { formatBytes, storageEstimate, escapeHtml } from '../core/util.js';
import { confirmModal } from '../ui/modal.js';

const BASE_PROCS = [
  { name: 'window-server', user: 'root', threads: 12, base: 6.2 },
  { name: 'canopy-init', user: 'root', threads: 3, base: 0.4 },
  { name: 'dock', user: 'canopy', threads: 4, base: 1.8 },
  { name: 'spotlight-indexer', user: 'canopy', threads: 2, base: 2.4 },
  { name: 'notification-center', user: 'canopy', threads: 2, base: 0.6 },
  { name: 'ambient-audio', user: 'canopy', threads: 5, base: 3.1 },
  { name: 'file-system-sync', user: 'canopy', threads: 2, base: 1.1 },
  { name: 'wallpaper-renderer', user: 'canopy', threads: 1, base: 0.9 },
  { name: 'mds-worker', user: 'canopy', threads: 3, base: 0.7 },
  { name: 'bluetoothd', user: 'root', threads: 2, base: 0.2 },
];

export default {
  id: 'activity',
  name: 'Activity Monitor',
  icon: 'activity',
  colors: ['#2b3a45', '#0f171d'],
  width: 880, height: 600,
  keywords: ['cpu', 'memory', 'processes', 'performance', 'task manager'],
  menus: (win) => [
    { label: 'View', items: [
      { label: 'CPU', action: () => win?._tab('cpu') },
      { label: 'Memory', action: () => win?._tab('memory') },
      { label: 'Energy', action: () => win?._tab('energy') },
      { label: 'Network', action: () => win?._tab('network') },
      { sep: true },
      { label: 'Quit Process…', action: () => win?._killSelected() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let tab = 'cpu';
    let selected = null;
    let history = { cpu: [], mem: [], net: [] };
    let raf = null;
    let sampling = true;
    const startTime = Date.now();

    root.innerHTML = `<div class="activity">
      <div class="act-tabs" data-tabs></div>
      <div class="act-graph"><canvas data-graph width="800" height="150"></canvas>
        <div class="act-graph-legend" data-legend></div></div>
      <div class="act-stats" data-stats></div>
      <div class="act-table-head"><span>Process Name</span><span>% CPU</span><span>Memory</span><span>Threads</span><span>User</span><span></span></div>
      <div class="act-table scroll-thin" data-table></div>
      <div class="act-foot"><span data-procs></span><span class="spacer"></span><span data-uptime></span></div>
    </div>`;

    const canvas = root.querySelector('[data-graph]');
    const ctx = canvas.getContext('2d');

    const processes = () => {
      const list = [...BASE_PROCS];
      allApps().forEach((a) => {
        const wins = wm.byApp(a.id).length;
        if (wins) list.push({ name: `canopy-${a.id}`, user: 'canopy', threads: 2 + wins, base: 1.5 + wins * 1.6 });
      });
      return list.map((p) => {
        const jitter = Math.random();
        return {
          ...p,
          cpu: Math.max(0, p.base + jitter * 3.2 - 1.2),
          mem: 24 + Math.round(Math.abs(Math.sin(p.name.length + jitter)) * 220) + p.threads * 4,
          pid: 100 + Math.abs(hash(p.name)) % 900,
        };
      }).sort((a, b) => b.cpu - a.cpu);
    };

    function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

    function renderTabs() {
      root.querySelector('[data-tabs]').innerHTML = [
        ['cpu', 'CPU', 'cpu'], ['memory', 'Memory', 'layers'], ['energy', 'Energy', 'bolt'], ['network', 'Network', 'globe'], ['disk', 'Disk', 'drive'],
      ].map(([id, label, icon]) => `<button class="act-tab ${tab === id ? 'on' : ''}" data-tab="${id}">${glyph(icon, 14, 1.8)}${label}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    }

    function sample() {
      const procs = processes();
      const cpu = procs.reduce((s, p) => s + p.cpu, 0) / Math.max(1, procs.length) * 1.4;
      const mem = procs.reduce((s, p) => s + p.mem, 0);
      const net = Math.random() * 120;
      history.cpu.push(Math.min(100, cpu)); history.mem.push(mem); history.net.push(net);
      if (history.cpu.length > 60) { history.cpu.shift(); history.mem.shift(); history.net.shift(); }
      return procs;
    }

    function drawGraph(procs) {
      const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = 150 * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      const grid = 6;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--stroke') || 'rgba(0,0,0,.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= grid; i++) {
        const y = (h / grid) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      const series = tab === 'memory' ? history.mem : tab === 'network' ? history.net : history.cpu;
      const max = tab === 'memory' ? Math.max(500, ...series) : tab === 'network' ? Math.max(20, ...series) : 100;
      const color = tab === 'memory' ? '#8e5cf7' : tab === 'network' ? '#5ac8fa' : tab === 'energy' ? '#ff9f0a' : '#30d158';
      if (series.length > 1) {
        ctx.beginPath();
        series.forEach((v, i) => {
          const x = (i / (series.length - 1)) * w;
          const y = h - (v / max) * (h - 8) - 4;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
        ctx.stroke();
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      const legend = root.querySelector('[data-legend]');
      const totalCpu = procs.reduce((s, p) => s + p.cpu, 0);
      const totalMem = procs.reduce((s, p) => s + p.mem, 0);
      legend.innerHTML = tab === 'memory'
        ? `<span><b>${(totalMem / 1024).toFixed(2)} GB</b> memory used</span><span class="muted">System ${(navigator.deviceMemory || 8)} GB</span>`
        : tab === 'network'
          ? `<span><b>${(history.net.at(-1) || 0).toFixed(1)} KB/s</b> down</span><span class="muted">${(Math.random() * 8).toFixed(1)} KB/s up</span>`
          : `<span><b>${Math.min(100, (history.cpu.at(-1) || 0)).toFixed(1)}%</b> CPU load</span><span class="muted">${procs.length} processes</span>`;
    }

    function renderTable(procs) {
      root.querySelector('[data-table]').innerHTML = procs.map((p) => `<div class="act-row ${p.pid === selected ? 'sel' : ''}" data-pid="${p.pid}">
        <span class="act-name"><span class="act-dot" style="background:${p.cpu > 8 ? '#ff9f0a' : '#30d158'}"></span>${escapeHtml(p.name)}<small>${p.pid}</small></span>
        <span>${p.cpu.toFixed(1)}</span>
        <span>${p.mem} MB</span>
        <span>${p.threads}</span>
        <span class="muted">${p.user}</span>
        <span><button class="icon-btn act-kill" data-kill="${p.pid}" title="Quit process">${glyph('close', 10, 2.6)}</button></span>
      </div>`).join('');
      root.querySelectorAll('.act-row').forEach((r) => r.addEventListener('click', () => { selected = Number(r.dataset.pid); root.querySelectorAll('.act-row').forEach((x) => x.classList.toggle('sel', x === r)); }));
      root.querySelectorAll('[data-kill]').forEach((b) => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const proc = procs.find((p) => p.pid === Number(b.dataset.kill));
        if (!proc) return;
        const ok = await confirmModal({ title: `Quit “${proc.name}”?`, body: 'Quitting a system process may affect stability. This is a simulation — nothing will actually break.', okLabel: 'Quit Process' });
        if (ok) {
          sound.play('error');
          import('../core/notify.js').then(({ notify }) => notify.post({ title: 'Process quit', body: `${proc.name} (${proc.pid}) exited.`, icon: 'activity', colors: ['#2b3a45', '#0f171d'] }));
        }
      }));
    }

    function render() {
      renderTabs();
      win.setTitle(`Activity Monitor — ${tab[0].toUpperCase() + tab.slice(1)}`);
      toolbar.innerHTML = `<span class="fn-toolbar-title">Activity Monitor</span><span class="spacer"></span>
        <button class="btn small no-drag" data-sample>${sampling ? 'Pause' : 'Resume'}</button>
        <button class="btn small no-drag" data-kill>${glyph('close', 10, 2.4)} Quit Process</button>`;
      toolbar.querySelector('[data-kill]').addEventListener('click', () => win._killSelected());
      toolbar.querySelector('[data-sample]').addEventListener('click', () => {
        sampling = !sampling;
        toolbar.querySelector('[data-sample]').textContent = sampling ? 'Pause' : 'Resume';
      });
      const procs = sample();
      drawGraph(procs);
      renderTable(procs);
      const stats = root.querySelector('[data-stats]');
      if (tab === 'disk') {
        stats.innerHTML = `<div><small>Read</small><b>${(Math.random() * 40).toFixed(1)} MB/s</b></div><div><small>Write</small><b>${(Math.random() * 12).toFixed(1)} MB/s</b></div><div><small>Free space</small><b>${formatBytes(512 * 1024 * 1024 * 1024)}</b></div><div><small>Files</small><b>${fs.stats().files}</b></div><div><small>Local storage</small><b>${formatBytes(storageEstimate())}</b></div>`;
        stats.style.display = '';
      } else {
        stats.innerHTML = `<div><small>Uptime</small><b>${Math.floor((Date.now() - startTime) / 1000)}s</b></div>
          <div><small>Processes</small><b>${procs.length}</b></div>
          <div><small>Threads</small><b>${procs.reduce((s, p) => s + p.threads, 0)}</b></div>
          <div><small>Accent</small><b>${store.get('accent')}</b></div>`;
      }
      root.querySelector('[data-procs]').textContent = `${procs.length} processes · ${procs.reduce((s, p) => s + p.threads, 0)} threads`;
      root.querySelector('[data-uptime]').textContent = `Session uptime ${Math.floor((Date.now() - startTime) / 1000)}s`;
    }

    win._tab = (t) => { tab = t; render(); };
    win._killSelected = async () => {
      if (!selected) return;
      const { confirmModal } = await import('../ui/modal.js');
      const ok = await confirmModal({ title: 'Quit selected process?', body: 'The process will be terminated.', okLabel: 'Quit' });
      if (ok) { selected = null; sound.play('error'); render(); }
    };

    render();
    const timer = setInterval(() => {
      if (!root.isConnected) { clearInterval(timer); return; }
      if (sampling) render();
    }, 2000);
    win.onClose(() => { clearInterval(timer); cancelAnimationFrame(raf); });
  },
};
