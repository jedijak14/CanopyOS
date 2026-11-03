/* CanopyOS — Memory match */
import { glyph } from '../core/icons.js';
import { sound } from '../core/sound.js';
import { notify } from '../core/notify.js';

const ICONS = ['leaf', 'flower', 'plant', 'mushroom', 'sun', 'moon', 'mountain', 'wave'];
const COLORS = [['#34d399', '#0f766e'], ['#f472b6', '#be185d'], ['#fbbf24', '#b45309'], ['#a78bfa', '#5b21b6'],
  ['#fcd34d', '#b45309'], ['#93c5fd', '#1d4ed8'], ['#86efac', '#15803d'], ['#67e8f9', '#0e7490']];

export default {
  id: 'memory',
  name: 'Memory',
  icon: 'memory',
  colors: ['#a78bfa', '#5b21b6'],
  width: 560, height: 620,
  keywords: ['game', 'cards', 'pairs', 'matching'],
  menus: () => [{ label: 'Game', items: [{ label: 'New Game', shortcut: '⌘N', action: () => window.dispatchEvent(new CustomEvent('canopy:mem-new')) }] }],

  mount({ root, win }) {
    let deck = [];
    let first = null;
    let second = null;
    let lock = false;
    let moves = 0;
    let matched = 0;
    let timeStart = null;
    let timer = null;
    let elapsed = 0;

    root.innerHTML = `<div class="memory">
      <div class="memory-head">
        <div><b>Memory</b><div class="tiny muted">Find all eight pairs</div></div>
        <div class="memory-stats"><div><small>MOVES</small><b data-moves>0</b></div><div><small>TIME</small><b data-time>0:00</b></div><div><small>PAIRS</small><b data-pairs>0/8</b></div></div>
      </div>
      <div class="memory-grid" data-grid></div>
      <div class="memory-foot"><button class="btn small primary" data-new>New Game</button><span class="spacer"></span><span class="tiny muted">Match two leaves to clear them</span></div>
      <div class="memory-win" data-win hidden></div>
    </div>`;

    const gridEl = root.querySelector('[data-grid]');
    const movesEl = root.querySelector('[data-moves]');
    const timeEl = root.querySelector('[data-time]');
    const pairsEl = root.querySelector('[data-pairs]');
    const winEl = root.querySelector('[data-win]');

    function reset() {
      const cards = [];
      ICONS.forEach((icon, i) => {
        cards.push({ id: `a${i}`, icon, colors: COLORS[i % COLORS.length] });
        cards.push({ id: `b${i}`, icon, colors: COLORS[i % COLORS.length] });
      });
      deck = cards.sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, uid: i, flipped: false, done: false }));
      first = null; second = null; lock = false; moves = 0; matched = 0; elapsed = 0;
      clearInterval(timer); timer = null; timeStart = null;
      movesEl.textContent = '0'; timeEl.textContent = '0:00'; pairsEl.textContent = '0/8';
      winEl.hidden = true;
      render();
    }

    function startTimer() {
      if (timer) return;
      timeStart = Date.now();
      timer = setInterval(() => {
        elapsed = Math.floor((Date.now() - timeStart) / 1000);
        timeEl.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
      }, 500);
    }

    function flip(card) {
      if (lock || card.done || card.flipped) return;
      if (!timer) startTimer();
      card.flipped = true;
      sound.play('click');
      if (!first) { first = card; render(); return; }
      second = card;
      moves += 1;
      movesEl.textContent = String(moves);
      render();
      lock = true;
      if (first.icon === second.icon) {
        setTimeout(() => {
          first.done = true; second.done = true;
          matched += 1;
          pairsEl.textContent = `${matched}/8`;
          first = null; second = null; lock = false;
          sound.play('success');
          render();
          if (matched === 8) finish();
        }, 420);
      } else {
        setTimeout(() => {
          first.flipped = false; second.flipped = false;
          first = null; second = null; lock = false;
          sound.play('error');
          render();
        }, 780);
      }
    }

    function finish() {
      clearInterval(timer); timer = null;
      const best = Number(localStorage.getItem('canopy.memory.best') || 0);
      if (!best || moves < best) localStorage.setItem('canopy.memory.best', String(moves));
      winEl.hidden = false;
      winEl.innerHTML = `<div class="memory-win-card"><div class="tiny" style="letter-spacing:.1em">COMPLETE</div><h3>All pairs found</h3>
        <div class="tiny muted">${moves} moves · ${elapsed}s${best && moves < best ? ' · new best!' : ''}</div>
        <button class="btn primary small" data-again style="margin-top:10px">Play again</button></div>`;
      winEl.querySelector('[data-again]').addEventListener('click', reset);
      notify.post({ title: 'Memory complete', body: `${moves} moves in ${elapsed} seconds.`, icon: 'memory', colors: ['#a78bfa', '#5b21b6'], app: 'Memory', appId: 'memory', silent: true });
    }

    function render() {
      gridEl.innerHTML = deck.map((c) => `<button class="memory-card ${c.flipped || c.done ? 'flipped' : ''} ${c.done ? 'done' : ''}" data-uid="${c.uid}">
        <span class="memory-card-inner">
          <span class="memory-face back">${glyph('leaf', 26, 1.5)}</span>
          <span class="memory-face front" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${glyph(c.icon, 32, 1.5)}</span>
        </span>
      </button>`).join('');
      gridEl.querySelectorAll('[data-uid]').forEach((b) => b.addEventListener('click', () => flip(deck[Number(b.dataset.uid)])));
    }

    root.querySelector('[data-new]').addEventListener('click', reset);
    const newH = () => reset();
    window.addEventListener('canopy:mem-new', newH);

    reset();
    win.onClose(() => { clearInterval(timer); window.removeEventListener('canopy:mem-new', newH); });
  },
};
