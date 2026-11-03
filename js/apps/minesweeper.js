/* CanopyOS — Minesweeper */
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';

const LEVELS = {
  easy: { cols: 9, rows: 9, mines: 10, label: 'Sprout' },
  medium: { cols: 16, rows: 16, mines: 40, label: 'Sapling' },
  hard: { cols: 24, rows: 16, mines: 70, label: 'Old Growth' },
};

export default {
  id: 'minesweeper',
  name: 'Minesweeper',
  icon: 'minesweeper',
  colors: ['#2f7d5c', '#154a35'],
  width: 620, height: 620,
  keywords: ['game', 'puzzle', 'mines', 'logic'],
  menus: () => [
    { label: 'Game', items: [
      { label: 'New Game', shortcut: '⌘N', action: () => window.dispatchEvent(new CustomEvent('canopy:ms-new')) },
      { sep: true },
      { label: 'Sprout (Easy)', action: () => window.dispatchEvent(new CustomEvent('canopy:ms-level', { detail: 'easy' })) },
      { label: 'Sapling (Medium)', action: () => window.dispatchEvent(new CustomEvent('canopy:ms-level', { detail: 'medium' })) },
      { label: 'Old Growth (Hard)', action: () => window.dispatchEvent(new CustomEvent('canopy:ms-level', { detail: 'hard' })) },
    ] },
  ],

  mount({ root, win }) {
    let level = 'easy';
    let board = [];
    let cols = 9;
    let rows = 9;
    let mineCount = 10;
    let started = false;
    let over = false;
    let won = false;
    let flags = 0;
    let time = 0;
    let timer = null;
    let firstClick = true;

    root.innerHTML = `<div class="ms">
      <div class="ms-head">
        <div class="ms-stat">${glyph('minesweeper', 14, 1.9)}<span data-mines>10</span></div>
        <button class="ms-face" data-reset aria-label="New game">🙂</button>
        <div class="ms-stat">${glyph('timer', 14, 1.9)}<span data-time>0</span></div>
      </div>
      <div class="ms-levels" data-levels>
        ${Object.entries(LEVELS).map(([id, l]) => `<button class="cc-chip ${id === level ? 'on' : ''}" data-level="${id}">${l.label}</button>`).join('')}
      </div>
      <div class="ms-board" data-board></div>
      <div class="ms-foot tiny muted">Click to reveal · right-click to flag · chord by clicking a number</div>
    </div>`;

    const boardEl = root.querySelector('[data-board]');
    const minesEl = root.querySelector('[data-mines]');
    const timeEl = root.querySelector('[data-time]');
    const faceEl = root.querySelector('[data-reset]');

    function reset() {
      const l = LEVELS[level];
      cols = l.cols; rows = l.rows; mineCount = l.mines;
      board = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ({ r, c, mine: false, revealed: false, flag: false, count: 0 })));
      started = false; over = false; won = false; flags = 0; time = 0; firstClick = true;
      clearInterval(timer); timer = null;
      timeEl.textContent = '0';
      minesEl.textContent = String(mineCount);
      faceEl.textContent = '🙂';
      boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      boardEl.style.fontSize = cols > 16 ? '11px' : '14px';
      render();
    }

    function placeMines(safeR, safeC) {
      let placed = 0;
      while (placed < mineCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (board[r][c].mine) continue;
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        board[r][c].mine = true;
        placed++;
      }
      board.forEach((row) => row.forEach((cell) => {
        cell.count = neighbors(cell).filter((n) => n.mine).length;
      }));
    }

    function neighbors(cell) {
      const out = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = cell.r + dr; const c = cell.c + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols) out.push(board[r][c]);
      }
      return out;
    }

    function startTimer() {
      if (timer) return;
      timer = setInterval(() => {
        if (over) return;
        time += 1;
        timeEl.textContent = String(time);
      }, 1000);
    }

    function reveal(cell) {
      if (over || cell.flag || cell.revealed) return;
      if (firstClick) {
        placeMines(cell.r, cell.c);
        firstClick = false;
        started = true;
        startTimer();
      }
      cell.revealed = true;
      if (cell.mine) {
        over = true;
        clearInterval(timer);
        faceEl.textContent = '😵';
        board.forEach((row) => row.forEach((c) => { if (c.mine) c.revealed = true; }));
        sound.play('error');
        render();
        return;
      }
      if (cell.count === 0) neighbors(cell).forEach((n) => { if (!n.revealed && !n.flag) reveal(n); });
      sound.play('click');
      checkWin();
      render();
    }

    function checkWin() {
      const hidden = board.flat().filter((c) => !c.revealed && !c.mine).length;
      if (hidden === 0) {
        over = true;
        won = true;
        clearInterval(timer);
        faceEl.textContent = '😎';
        board.forEach((row) => row.forEach((c) => { if (c.mine) c.flag = true; }));
        flags = mineCount;
        sound.play('success');
        import('../core/notify.js').then(({ notify }) => notify.post({ title: 'You win!', body: `${LEVELS[level].label} cleared in ${time}s.`, icon: 'minesweeper', colors: ['#2f7d5c', '#154a35'], app: 'Minesweeper', appId: 'minesweeper' }));
      }
    }

    function chord(cell) {
      if (!cell.revealed || cell.count === 0) return;
      const around = neighbors(cell);
      if (around.filter((n) => n.flag).length === cell.count) around.forEach((n) => { if (!n.flag && !n.revealed) reveal(n); });
    }

    function render() {
      boardEl.innerHTML = board.map((row) => row.map((cell) => {
        let content = '';
        let cls = 'ms-cell';
        if (cell.revealed) {
          cls += ' open';
          if (cell.mine) { content = '💥'; cls += ' mine'; }
          else if (cell.count) { content = String(cell.count); cls += ` n${cell.count}`; }
        } else if (cell.flag) { content = '🚩'; cls += ' flag'; }
        return `<button class="${cls}" data-r="${cell.r}" data-c="${cell.c}">${content}</button>`;
      }).join('')).join('');

      boardEl.querySelectorAll('[data-r]').forEach((btn) => {
        const cell = board[Number(btn.dataset.r)][Number(btn.dataset.c)];
        btn.addEventListener('click', () => { if (cell.revealed && cell.count) chord(cell); else reveal(cell); });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (over || cell.revealed) return;
          cell.flag = !cell.flag;
          flags += cell.flag ? 1 : -1;
          minesEl.textContent = String(mineCount - flags);
          sound.play('toggle');
          render();
        });
      });
      if (over && !won) boardEl.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    }

    const resetHandler = () => reset();
    const levelHandler = (e) => { level = e.detail; reset(); renderLevels(); };
    window.addEventListener('canopy:ms-new', resetHandler);
    window.addEventListener('canopy:ms-level', levelHandler);
    win.onClose(() => { clearInterval(timer); window.removeEventListener('canopy:ms-new', resetHandler); window.removeEventListener('canopy:ms-level', levelHandler); });

    function renderLevels() {
      root.querySelectorAll('[data-level]').forEach((b) => b.classList.toggle('on', b.dataset.level === level));
    }
    root.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.level; reset(); renderLevels(); }));
    faceEl.addEventListener('click', reset);

    reset();
  },
};
