/* CanopyOS — 2048 */
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { notify } from '../core/notify.js';

const TILE_COLORS = {
  2: ['#eee4da', '#5f5347'], 4: ['#ede0c8', '#5f5347'], 8: ['#f2b179', '#fff'], 16: ['#f59563', '#fff'],
  32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'], 128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'],
  512: ['#edc850', '#fff'], 1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff'],
};

export default {
  id: 'game2048',
  name: '2048',
  icon: 'game2048',
  colors: ['#f7c15c', '#c9721b'],
  width: 480, height: 600,
  keywords: ['game', 'puzzle', 'numbers', 'merge'],
  menus: () => [
    { label: 'Game', items: [
      { label: 'New Game', shortcut: '⌘N', action: () => window.dispatchEvent(new CustomEvent('canopy:2048-new')) },
      { label: 'Undo', shortcut: '⌘Z', action: () => window.dispatchEvent(new CustomEvent('canopy:2048-undo')) },
    ] },
  ],

  mount({ root, win }) {
    let grid = [];
    let score = 0;
    let best = Number(localStorage.getItem('canopy.2048.best') || 0);
    let prev = null;
    let won = false;
    let over = false;

    root.innerHTML = `<div class="g2048">
      <div class="g2048-head">
        <div class="g2048-title">2048</div>
        <div class="g2048-scores"><div><small>SCORE</small><b data-score>0</b></div><div><small>BEST</small><b data-best>0</b></div></div>
      </div>
      <div class="g2048-bar"><button class="btn small" data-undo>${glyph('refresh', 11, 2)} Undo</button><span class="spacer"></span><button class="btn small primary" data-new>New Game</button></div>
      <div class="g2048-board" data-board></div>
      <div class="g2048-foot tiny muted">Use arrow keys or WASD · Ctrl+Z to undo</div>
      <div class="g2048-over" data-over hidden></div>
    </div>`;

    const boardEl = root.querySelector('[data-board]');
    const scoreEl = root.querySelector('[data-score]');
    const bestEl = root.querySelector('[data-best]');
    const overEl = root.querySelector('[data-over]');

    const empty = () => grid.flat().filter((v) => !v).length;

    function addTile() {
      const slots = [];
      grid.forEach((row, r) => row.forEach((v, c) => { if (!v) slots.push([r, c]); }));
      if (!slots.length) return;
      const [r, c] = slots[Math.floor(Math.random() * slots.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    function reset() {
      grid = Array.from({ length: 4 }, () => Array(4).fill(0));
      score = 0;
      prev = null;
      won = false;
      over = false;
      overEl.hidden = true;
      addTile(); addTile();
      render();
    }

    function snapshot() { prev = { grid: grid.map((r) => r.slice()), score, won }; }

    function slide(row) {
      const vals = row.filter((v) => v);
      const out = [];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); score += vals[i] * 2; if (vals[i] * 2 === 2048 && !won) { won = true; win2048(); } i++; }
        else out.push(vals[i]);
      }
      while (out.length < 4) out.push(0);
      return out;
    }

    function rotate(g) { return g[0].map((_, i) => g.map((row) => row[i]).reverse()); }

    function move(dir) {
      if (over) return;
      const before = JSON.stringify(grid);
      snapshot();
      let g = grid.map((r) => r.slice());
      const times = { left: 0, up: 1, right: 2, down: 3 }[dir];
      for (let i = 0; i < times; i++) g = rotate(g);
      g = g.map(slide);
      for (let i = 0; i < (4 - times) % 4; i++) g = rotate(g);
      grid = g;
      if (JSON.stringify(grid) !== before) {
        addTile();
        sound.play('click');
        if (empty() === 0 && !canMove()) gameOver();
      } else {
        prev = null;
      }
      render();
    }

    function canMove() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) return true;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
      }
      return false;
    }

    function gameOver() {
      over = true;
      overEl.hidden = false;
      overEl.innerHTML = `<div><div class="g2048-over-title">Game over</div><div class="muted tiny">You scored ${score}</div><button class="btn primary small" data-again style="margin-top:10px">Try again</button></div>`;
      overEl.querySelector('[data-again]').addEventListener('click', reset);
      sound.play('error');
    }

    function win2048() {
      notify.post({ title: '2048!', body: 'You reached the 2048 tile. Keep going for a higher score.', icon: 'game2048', colors: ['#f7c15c', '#c9721b'], app: '2048', appId: 'game2048' });
      sound.play('success');
    }

    function render() {
      boardEl.innerHTML = grid.flat().map((v) => {
        const [bg, fg] = TILE_COLORS[v] || ['#3c3a32', '#fff'];
        const size = v >= 1024 ? '22px' : v >= 128 ? '26px' : '30px';
        return `<div class="g2048-tile" style="background:${v ? bg : 'rgba(120,110,100,.12)'};color:${v ? fg : 'transparent'};font-size:${size}">${v || ''}</div>`;
      }).join('');
      scoreEl.textContent = String(score);
      if (score > best) { best = score; localStorage.setItem('canopy.2048.best', String(best)); }
      bestEl.textContent = String(best);
    }

    function undo() {
      if (!prev) return;
      grid = prev.grid;
      score = prev.score;
      won = prev.won;
      prev = null;
      over = false;
      overEl.hidden = true;
      render();
    }

    const onKey = (e) => {
      if (document.querySelector('#modal-root.show')) return;
      const k = e.key.toLowerCase();
      const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
      if (map[k]) { e.preventDefault(); move(map[k]); }
      if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && k === 'n') { e.preventDefault(); reset(); }
    };
    document.addEventListener('keydown', onKey);

    // swipe
    let touchStart = null;
    boardEl.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
    boardEl.addEventListener('pointerup', (e) => {
      if (!touchStart) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touchStart = null;
    });

    const newHandler = () => reset();
    const undoHandler = () => undo();
    window.addEventListener('canopy:2048-new', newHandler);
    window.addEventListener('canopy:2048-undo', undoHandler);
    root.querySelector('[data-new]').addEventListener('click', reset);
    root.querySelector('[data-undo]').addEventListener('click', undo);
    root.querySelector('[data-board]')?.setAttribute('tabindex', '0');

    win.onClose(() => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('canopy:2048-new', newHandler);
      window.removeEventListener('canopy:2048-undo', undoHandler);
    });

    reset();
  },
};
