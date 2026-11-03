/* CanopyOS — Snake */
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { notify } from '../core/notify.js';

const GRID = 22;
const SPEEDS = { chill: 170, normal: 120, fast: 80 };

export default {
  id: 'snake',
  name: 'Snake',
  icon: 'snake',
  colors: ['#7bd88f', '#2b7a4b'],
  width: 560, height: 660,
  keywords: ['game', 'arcade', 'classic', 'garden'],
  menus: () => [
    { label: 'Game', items: [
      { label: 'New Game', shortcut: '⌘N', action: () => window.dispatchEvent(new CustomEvent('canopy:snake-new')) },
      { label: 'Pause', shortcut: 'Space', action: () => window.dispatchEvent(new CustomEvent('canopy:snake-pause')) },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let snake = [{ x: 10, y: 10 }];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = { x: 15, y: 10 };
    let score = 0;
    let best = Number(localStorage.getItem('canopy.snake.best') || 0);
    let speed = 'normal';
    let running = false;
    let paused = false;
    let over = false;
    let loop = null;

    root.innerHTML = `<div class="snake">
      <div class="snake-head"><div><b>Snake</b><div class="tiny muted">Eat leaves · grow · survive</div></div>
        <div class="snake-scores"><div><small>SCORE</small><b data-score>0</b></div><div><small>BEST</small><b data-best>0</b></div></div></div>
      <div class="snake-toolbar">
        <div class="snake-speeds">${Object.keys(SPEEDS).map((s) => `<button class="cc-chip ${s === speed ? 'on' : ''}" data-speed="${s}">${s}</button>`).join('')}</div>
        <span class="spacer"></span>
        <button class="btn small" data-pause>${glyph('pause', 10, 2.4)} Pause</button>
        <button class="btn small primary" data-new>New Game</button>
      </div>
      <div class="snake-canvas-wrap"><canvas data-canvas width="480" height="480" aria-label="Snake game"></canvas>
        <div class="snake-overlay" data-overlay hidden></div></div>
      <div class="snake-dpad">
        <button data-dir="up">▲</button>
        <div><button data-dir="left">◀</button><button data-dir="down">▼</button><button data-dir="right">▶</button></div>
      </div>
      <div class="tiny muted center">Arrow keys / WASD · Space pauses</div>
    </div>`;

    const canvas = root.querySelector('[data-canvas]');
    const ctx = canvas.getContext('2d');
    const overlay = root.querySelector('[data-overlay]');
    const scoreEl = root.querySelector('[data-score]');
    const bestEl = root.querySelector('[data-best]');

    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }

    function reset() {
      snake = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      over = false;
      paused = false;
      placeFood();
      scoreEl.textContent = '0';
      overlay.hidden = true;
      start();
      draw();
    }

    function start() {
      running = true;
      clearInterval(loop);
      loop = setInterval(step, SPEEDS[speed]);
    }

    function stop() { running = false; clearInterval(loop); loop = null; }

    function step() {
      if (!running || paused || over) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID || snake.some((s) => s.x === head.x && s.y === head.y)) {
        return end();
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = String(score);
        if (score > best) { best = score; localStorage.setItem('canopy.snake.best', String(best)); bestEl.textContent = String(best); }
        placeFood();
        sound.play('pop');
      } else snake.pop();
      draw();
    }

    function end() {
      over = true;
      stop();
      overlay.hidden = false;
      overlay.innerHTML = `<div><div class="snake-over-title">Game over</div><div class="tiny muted">Score ${score} · best ${best}</div><button class="btn primary small" data-again style="margin-top:10px">Play again</button></div>`;
      overlay.querySelector('[data-again]').addEventListener('click', reset);
      sound.play('error');
      notify.post({ title: 'Snake', body: `Game over — you scored ${score}.`, icon: 'snake', colors: ['#7bd88f', '#2b7a4b'], app: 'Snake', appId: 'snake', silent: true });
    }

    function draw() {
      const size = canvas.width / GRID;
      ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#1b2a21' : '#eef7ee';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // subtle grid
      ctx.strokeStyle = 'rgba(120,160,130,.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * size, 0); ctx.lineTo(i * size, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * size); ctx.lineTo(canvas.width, i * size); ctx.stroke();
      }
      // food
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(food.x * size + size / 2 - 1, food.y * size + size * 0.14, 2, size * 0.16);
      // snake
      snake.forEach((s, i) => {
        const t = i / snake.length;
        ctx.fillStyle = i === 0 ? '#15803d' : `rgba(34,197,94,${0.95 - t * 0.45})`;
        const pad = i === 0 ? 1 : 2;
        roundRect(s.x * size + pad, s.y * size + pad, size - pad * 2, size - pad * 2, 4);
        ctx.fill();
        if (i === 0) {
          ctx.fillStyle = '#eaffea';
          const ex = s.x * size + size / 2; const ey = s.y * size + size / 2;
          ctx.beginPath(); ctx.arc(ex - 3, ey - 2, 1.8, 0, 7); ctx.arc(ex + 3, ey - 2, 1.8, 0, 7); ctx.fill();
        }
      });
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function turn(d) {
      const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      const nd = map[d];
      if (!nd) return;
      if (nd.x === -dir.x && nd.y === -dir.y) return;
      nextDir = nd;
    }

    const onKey = (e) => {
      if (document.querySelector('#modal-root.show')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'w'].includes(k)) { e.preventDefault(); turn('up'); }
      if (['arrowdown', 's'].includes(k)) { e.preventDefault(); turn('down'); }
      if (['arrowleft', 'a'].includes(k)) { e.preventDefault(); turn('left'); }
      if (['arrowright', 'd'].includes(k)) { e.preventDefault(); turn('right'); }
      if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    };
    document.addEventListener('keydown', onKey);

    function togglePause() {
      if (over) return;
      paused = !paused;
      overlay.hidden = !paused;
      if (paused) overlay.innerHTML = '<div><div class="snake-over-title">Paused</div><div class="tiny muted">Press Space to resume</div></div>';
      root.querySelector('[data-pause]').textContent = paused ? 'Resume' : 'Pause';
    }

    root.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => turn(b.dataset.dir)));
    root.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
      speed = b.dataset.speed;
      root.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
      if (running && !paused) start();
    }));
    root.querySelector('[data-new]').addEventListener('click', reset);
    root.querySelector('[data-pause]').addEventListener('click', togglePause);
    const newH = () => reset();
    const pauseH = () => togglePause();
    window.addEventListener('canopy:snake-new', newH);
    window.addEventListener('canopy:snake-pause', pauseH);

    bestEl.textContent = String(best);
    reset();

    win.onClose(() => {
      stop();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('canopy:snake-new', newH);
      window.removeEventListener('canopy:snake-pause', pauseH);
    });
  },
};
