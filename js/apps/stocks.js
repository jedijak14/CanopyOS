/* CanopyOS — Stocks: watchlist, charts and market news */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { quote, allQuotes, searchQuotes, tick } from '../core/stocks.js';
import { escapeHtml, fmtNumber } from '../core/util.js';

const RANGES = [['1D', 2], ['1W', 7], ['1M', 30], ['3M', 90]];

export default {
  id: 'stocks',
  name: 'Stocks',
  icon: 'stocks',
  colors: ['#1f2937', '#0b1117'],
  width: 900, height: 600,
  keywords: ['market', 'finance', 'trading', 'shares', 'invest'],
  menus: (win) => [
    { label: 'File', items: [
      { label: 'Refresh', shortcut: '⌘R', action: () => win?._refresh() },
      { label: 'Add Symbol…', action: () => win?._add() },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let watch = data.get('watchlist', ['CNPY', 'FERN', 'LEAF', 'MYCL', 'ACRN']);
    let selected = watch[0] || 'CNPY';
    let range = '1M';
    let query = '';

    root.innerHTML = `<div class="stocks">
      <aside class="stocks-side">
        <div class="stocks-side-title">Watchlist</div>
        <div class="stocks-list" data-list></div>
        <button class="stocks-add" data-add>${glyph('plusCircle', 13, 1.8)} Add Symbol</button>
      </aside>
      <section class="stocks-main scroll-thin" data-main></section>
    </div>`;

    const listEl = root.querySelector('[data-list]');
    const mainEl = root.querySelector('[data-main]');

    function sparkline(points, color, w = 74, h = 26) {
      if (!points?.length) return '';
      const min = Math.min(...points);
      const max = Math.max(...points);
      const span = max - min || 1;
      const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * (h - 3) - 1.5}`).join(' ');
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    }

    function bigChart(q) {
      const pts = q.history.slice(-(RANGES.find((r) => r[0] === range)?.[1] || 30) * 1);
      const w = 520; const h = 210;
      const min = Math.min(...pts.map((p) => p.p));
      const max = Math.max(...pts.map((p) => p.p));
      const span = max - min || 1;
      const coords = pts.map((p, i) => [(i / (pts.length - 1)) * w, h - ((p.p - min) / span) * (h - 24) - 12]);
      const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const area = `0,${h} ${line} ${w},${h}`;
      const color = q.change >= 0 ? '#30d158' : '#ff453a';
      const gridLines = Array.from({ length: 4 }, (_, i) => `<line x1="0" y1="${(h / 4) * i}" x2="${w}" y2="${(h / 4) * i}" stroke="currentColor" stroke-opacity=".08"/>`).join('');
      return `<svg class="stocks-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
        ${gridLines}
        <polygon points="${area}" fill="url(#sg)"/>
        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      </svg>`;
    }

    function renderList() {
      const rows = watch.map((sym) => quote(sym)).filter(Boolean);
      listEl.innerHTML = rows.map((q) => `<button class="stocks-row ${q.sym === selected ? 'active' : ''}" data-sym="${q.sym}">
        <div class="stocks-row-main"><b>${q.sym}</b><small>${escapeHtml(q.name)}</small></div>
        ${sparkline(q.spark, q.change >= 0 ? '#30d158' : '#ff453a')}
        <div class="stocks-row-price"><b>$${q.price.toFixed(2)}</b><small class="${q.change >= 0 ? 'up' : 'down'}">${q.change >= 0 ? '+' : ''}${q.pct.toFixed(2)}%</small></div>
      </button>`).join('');
      listEl.querySelectorAll('[data-sym]').forEach((b) => b.addEventListener('click', () => {
        selected = b.dataset.sym;
        render();
      }));
    }

    function renderMain() {
      const q = quote(selected);
      if (!q) { mainEl.innerHTML = '<div class="empty-state">Unknown symbol</div>'; return; }
      const indices = allQuotes().filter((x) => x.isIndex);
      mainEl.innerHTML = `<div class="stocks-head">
          <div><div class="stocks-sym">${q.sym}</div><div class="stocks-name">${escapeHtml(q.name)} · ${escapeHtml(q.sector || 'Index')}</div></div>
          <span class="spacer"></span>
          <div class="stocks-price"><div class="stocks-big">$${q.price.toFixed(2)}</div>
            <div class="${q.change >= 0 ? 'up' : 'down'}">${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.pct.toFixed(2)}%)</div></div>
        </div>
        <div class="stocks-ranges">${RANGES.map(([label]) => `<button class="stocks-range ${range === label ? 'on' : ''}" data-range="${label}">${label}</button>`).join('')}</div>
        ${bigChart(q)}
        <div class="stocks-stats">
          ${[['Open', `$${q.open?.toFixed(2)}`], ['High', `$${q.high.toFixed(2)}`], ['Low', `$${q.low.toFixed(2)}`], ['Volume', fmtNumber(q.volume)], ['Mkt Cap', `$${(q.marketCap / 1e9).toFixed(1)}B`], ['Sector', q.sector || 'Index']].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}
        </div>
        <div class="stocks-news">
          <h4>Market News</h4>
          ${[
            [`${q.name} beats expectations in latest quarter`, 'Canopy Wire · 2h ago'],
            ['Green tech index closes at a six-week high', 'Understory Financial · 5h ago'],
            ['Analysts raise targets across the sector', 'Fern Analytics · 1d ago'],
          ].map(([title, src]) => `<button class="stocks-news-item" data-news="${escapeHtml(title)}"><b>${escapeHtml(title)}</b><small>${src}</small></button>`).join('')}
        </div>
        <div class="stocks-indices">${indices.map((i) => `<div class="stocks-index"><b>${i.sym}</b><span class="${i.change >= 0 ? 'up' : 'down'}">${i.price.toFixed(2)} ${i.change >= 0 ? '▲' : '▼'} ${Math.abs(i.pct).toFixed(2)}%</span></div>`).join('')}</div>`;
      mainEl.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { range = b.dataset.range; renderMain(); }));
      mainEl.querySelectorAll('[data-news]').forEach((b) => b.addEventListener('click', () => {
        import('../ui/modal.js').then(({ alertModal }) => alertModal({ title: b.dataset.news, body: 'Full story coverage is simulated in this build.<br><br><span class="tiny muted">Canopy Wire · Market data is generated locally for demonstration.</span>', art: 'chart' }));
      }));
    }

    win._refresh = () => { tick(); render(); sound.play('pop'); };
    win._add = async () => {
      const { promptModal } = await import('../ui/modal.js');
      const sym = await promptModal({ title: 'Add Symbol', label: 'Try CNPY, FERN, LEAF, MYCL, HIVE, BARK, SPRO', value: 'HIVE', okLabel: 'Add' });
      if (!sym) return;
      const q = quote(sym.toUpperCase());
      if (!q) return;
      if (!watch.includes(q.sym)) watch = [...watch, q.sym];
      data.set('watchlist', watch);
      selected = q.sym;
      render();
    };

    root.querySelector('[data-add]').addEventListener('click', () => win._add());

    function render() {
      renderList();
      renderMain();
      win.setTitle(`Stocks — ${selected}`);
      toolbar.innerHTML = `<span class="fn-toolbar-title">Stocks</span><span class="spacer"></span>
        <label class="fn-search no-drag">${glyph('search', 12, 2)}<input type="search" placeholder="Search symbols" data-q aria-label="Search symbols" /></label>
        <button class="icon-btn no-drag" data-refresh title="Refresh">${glyph('refresh', 15, 1.8)}</button>`;
      const q = toolbar.querySelector('[data-q]');
      q.value = query;
      q.addEventListener('input', () => {
        query = q.value;
        if (!query) { renderList(); return; }
        const matches = searchQuotes(query);
        listEl.innerHTML = matches.map((x) => `<button class="stocks-row" data-sym2="${x.sym}"><div class="stocks-row-main"><b>${x.sym}</b><small>${escapeHtml(x.name)}</small></div><span class="spacer"></span><small>$${x.price.toFixed(2)}</small></button>`).join('') || '<div class="tiny muted" style="padding:10px">No matches</div>';
        listEl.querySelectorAll('[data-sym2]').forEach((b) => b.addEventListener('click', () => {
          if (!watch.includes(b.dataset.sym2)) watch = [...watch, b.dataset.sym2];
          data.set('watchlist', watch);
          selected = b.dataset.sym2;
          query = '';
          render();
        }));
      });
      toolbar.querySelector('[data-refresh]').addEventListener('click', () => win._refresh());
    }

    render();
    const timer = setInterval(() => { if (!root.isConnected) return clearInterval(timer); tick(); renderList(); renderMain(); }, 12000);
    win.onClose(() => clearInterval(timer));
  },
};
