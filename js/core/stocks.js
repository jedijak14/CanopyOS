/* CanopyOS — simulated market data with deterministic random walks */
import { seededRandom } from './util.js';

const COMPANIES = [
  { sym: 'CNPY', name: 'Canopy Systems', base: 184.2, sector: 'Technology' },
  { sym: 'MOSY', name: 'Mossy Robotics', base: 64.5, sector: 'Robotics' },
  { sym: 'FERN', name: 'Fern Analytics', base: 128.75, sector: 'Software' },
  { sym: 'ACRN', name: 'Acorn Financial', base: 342.1, sector: 'Finance' },
  { sym: 'RTLX', name: 'Rootline Energy', base: 41.3, sector: 'Energy' },
  { sym: 'HIVE', name: 'Hive Networks', base: 92.6, sector: 'Networking' },
  { sym: 'BARK', name: 'Barkwood Foods', base: 28.4, sector: 'Consumer' },
  { sym: 'LEAF', name: 'Leafwork Labs', base: 213.9, sector: 'Biotech' },
  { sym: 'MYCL', name: 'Mycelium Cloud', base: 76.15, sector: 'Cloud' },
  { sym: 'SPRO', name: 'Spruce Media', base: 155.05, sector: 'Media' },
];

const INDEXES = [
  { sym: 'CPX', name: 'Canopy Composite', base: 4412.6 },
  { sym: 'GRN', name: 'Green Tech 100', base: 1876.2 },
];

const state = new Map();

function historyFor(sym, base) {
  if (state.has(sym)) return state.get(sym);
  const rnd = seededRandom(sym);
  const points = [];
  let price = base * (0.82 + rnd() * 0.1);
  const now = Date.now();
  for (let i = 90; i >= 0; i--) {
    price += (rnd() - 0.48) * base * 0.018;
    price = Math.max(base * 0.55, price);
    points.push({ t: now - i * 86400000, p: Number(price.toFixed(2)) });
  }
  const data = { points, price: points[points.length - 1].p };
  state.set(sym, data);
  return data;
}

export function quote(sym) {
  const company = [...COMPANIES, ...INDEXES].find((c) => c.sym === sym);
  if (!company) return null;
  const { points, price } = historyFor(sym, company.base);
  const prev = points[points.length - 2]?.p || price;
  const change = price - prev;
  const pct = (change / prev) * 100;
  const spark = points.slice(-30).map((p) => p.p);
  return {
    ...company,
    price,
    change,
    pct,
    open: points[points.length - 2]?.p,
    high: Math.max(...spark),
    low: Math.min(...spark),
    volume: Math.round(1_000_000 + (Math.abs(Math.sin(price)) * 40_000_000)),
    marketCap: price * (200_000_000 + Math.round(Math.abs(Math.cos(price)) * 900_000_000)),
    spark,
    history: points,
    isIndex: INDEXES.some((i) => i.sym === sym),
  };
}

export function allQuotes() {
  return [...COMPANIES, ...INDEXES].map((c) => quote(c.sym));
}

export function searchQuotes(q) {
  const s = q.toLowerCase();
  return allQuotes().filter((c) => c.sym.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
}

export function tick() {
  const out = [];
  for (const c of [...COMPANIES, ...INDEXES]) {
    const d = historyFor(c.sym, c.base);
    const last = d.points[d.points.length - 1];
    const drift = (Math.random() - 0.5) * c.base * 0.004;
    last.p = Number(Math.max(c.base * 0.5, last.p + drift).toFixed(2));
    d.price = last.p;
    out.push(quote(c.sym));
  }
  return out;
}
