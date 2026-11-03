/* CanopyOS — Calculator (basic + scientific) */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';

import { escapeHtml, copyText } from '../core/util.js';

export default {
  id: 'calculator',
  name: 'Calculator',
  icon: 'calculator',
  colors: ['#5b6472', '#1c2129'],
  width: 320, height: 470,
  minWidth: 300, minHeight: 380,
  keywords: ['calc', 'math', 'numbers', 'convert'],
  menus: () => [
    { label: 'View', items: [
      { label: 'Basic', action: () => window.dispatchEvent(new CustomEvent('canopy:calc-view', { detail: 'basic' })) },
      { label: 'Scientific', action: () => window.dispatchEvent(new CustomEvent('canopy:calc-view', { detail: 'sci' })) },
    ] },
    { label: 'Edit', items: [
      { label: 'Copy Result', shortcut: '⌘C', action: () => window.dispatchEvent(new CustomEvent('canopy:calc-copy')) },
      { label: 'Clear', shortcut: 'Esc', action: () => window.dispatchEvent(new CustomEvent('canopy:calc-clear')) },
    ] },
  ],

  mount({ root, win }) {
    let display = '0';
    let expression = '';
    let acc = null;
    let pending = null;
    let fresh = true;
    let sci = false;
    let history = data.get('calcHistory', []);
    let memory = data.get('calcMemory', 0);

    root.innerHTML = `<div class="calc">
      <div class="calc-tape scroll-thin" data-tape></div>
      <div class="calc-display">
        <div class="calc-expr" data-expr>&nbsp;</div>
        <div class="calc-num" data-num>0</div>
      </div>
      <div class="calc-keys" data-keys></div>
    </div>`;

    const numEl = root.querySelector('[data-num]');
    const exprEl = root.querySelector('[data-expr]');
    const tapeEl = root.querySelector('[data-tape]');
    const keysEl = root.querySelector('[data-keys]');

    const fmt = (n) => {
      if (!isFinite(n)) return 'Error';
      if (typeof n !== 'number') return n;
      const abs = Math.abs(n);
      if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(6);
      const [int, dec] = String(Number(n.toPrecision(12))).split('.');
      return Number(int).toLocaleString('en-US') + (dec ? '.' + dec : '');
    };

    function renderTape() {
      tapeEl.innerHTML = history.slice(0, 8).map((h) => `<button class="calc-tape-row" data-tape-val="${h.result}"><span>${escapeHtml(h.expr)}</span><b>${escapeHtml(fmt(h.result))}</b></button>`).join('')
        || '<div class="calc-tape-empty">History</div>';
      tapeEl.querySelectorAll('[data-tape-val]').forEach((b) => b.addEventListener('click', () => {
        display = b.dataset.tapeVal;
        fresh = true;
        render();
      }));
    }

    function render() {
      numEl.textContent = display;
      const size = display.length > 12 ? '22px' : display.length > 9 ? '28px' : '38px';
      numEl.style.fontSize = size;
      exprEl.textContent = expression || (acc !== null && pending ? `${fmt(acc)} ${pending}` : '\u00a0');
    }

    function pushHistory(expr, result) {
      history = [{ expr, result }, ...history].slice(0, 30);
      data.set('calcHistory', history);
      renderTape();
    }

    function calculate(a, op, b) {
      switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? NaN : a / b;
        case '^': return Math.pow(a, b);
        case 'mod': return a % b;
        default: return b;
      }
    }

    function inputDigit(d) {
      if (fresh) { display = d === '.' ? '0.' : d; fresh = false; }
      else if (d === '.') { if (!display.includes('.')) display += '.'; }
      else display = display === '0' ? d : display + d;
      if (display.length > 16) display = display.slice(0, 16);
      render();
    }

    function applyOp(op) {
      const val = parseFloat(display.replace(/,/g, ''));
      if (pending && !fresh) {
        const result = calculate(acc, pending, val);
        acc = result;
        display = isNaN(result) ? 'Error' : String(Number(result.toPrecision(12)));
        pushHistory(`${fmt(parseFloat(acc))} ${op}`, result);
      } else {
        acc = val;
      }
      pending = op;
      expression = `${fmt(acc)} ${op}`;
      fresh = true;
      render();
    }

    function equals() {
      const val = parseFloat(display.replace(/,/g, ''));
      if (pending) {
        const result = calculate(acc, pending, val);
        const expr = `${fmt(acc)} ${pending} ${fmt(val)}`;
        display = isNaN(result) ? 'Error' : fmt(result);
        pushHistory(expr, isNaN(result) ? 'Error' : Number(result.toPrecision(12)));
        expression = `${expr} =`;
        acc = null;
        pending = null;
        fresh = true;
        sound.play('pop');
      }
      render();
    }

    function clearAll() {
      display = '0'; expression = ''; acc = null; pending = null; fresh = true; render();
    }

    function unary(kind) {
      const v = parseFloat(display.replace(/,/g, ''));
      let r = v;
      if (kind === 'sqrt') r = Math.sqrt(v);
      if (kind === 'sq') r = v * v;
      if (kind === 'inv') r = 1 / v;
      if (kind === 'neg') r = -v;
      if (kind === 'pct') r = v / 100;
      if (kind === 'sin') r = Math.sin(v);
      if (kind === 'cos') r = Math.cos(v);
      if (kind === 'tan') r = Math.tan(v);
      if (kind === 'ln') r = Math.log(v);
      if (kind === 'log') r = Math.log10(v);
      if (kind === 'fact') { r = 1; for (let i = 2; i <= Math.min(v, 170); i++) r *= i; }
      display = isNaN(r) || !isFinite(r) ? 'Error' : fmt(r);
      fresh = true;
      expression = `${kind}(${fmt(v)})`;
      render();
    }

    const BASIC = [
      ['AC', 'c'], ['±', 'neg'], ['%', 'pct'], ['÷', 'op'],
      ['7', 'd'], ['8', 'd'], ['9', 'd'], ['×', 'op'],
      ['4', 'd'], ['5', 'd'], ['6', 'd'], ['−', 'op'],
      ['1', 'd'], ['2', 'd'], ['3', 'd'], ['+', 'op'],
      ['0', 'd', 'wide'], ['.', 'd'], ['=', 'eq'],
    ];
    const SCI = [
      ['sin', 'fn'], ['cos', 'fn'], ['tan', 'fn'], ['ln', 'fn'],
      ['x²', 'fn'], ['√x', 'fn'], ['xʸ', 'op'], ['1/x', 'fn'],
      ['π', 'const'], ['e', 'const'], ['n!', 'fn'], ['mod', 'op'],
      ['MC', 'mem'], ['MR', 'mem'], ['M+', 'mem'], ['M−', 'mem'],
    ];

    function renderKeys() {
      const sciKeys = sci ? SCI.map(([label, type]) => `<button class="calc-key sci" data-type="${type}" data-label="${label}">${label}</button>`).join('') : '';
      keysEl.innerHTML = `<div class="calc-sci">${sciKeys}</div>
        <div class="calc-pad">${BASIC.map(([label, type, extra]) => `<button class="calc-key ${type} ${extra || ''}" data-type="${type}" data-label="${label}">${label}</button>`).join('')}</div>`;
      keysEl.querySelectorAll('.calc-key').forEach((b) => {
        b.addEventListener('click', () => handleKey(b.dataset.type, b.dataset.label));
      });
    }

    function handleKey(type, label) {
      sound.play('click');
      if (type === 'd') inputDigit(label);
      else if (type === 'op') {
        if (label === 'xʸ') applyOp('^');
        else if (label === 'mod') applyOp('mod');
        else applyOp(label);
      } else if (type === 'eq') equals();
      else if (type === 'c') clearAll();
      else if (type === 'fn') unary({ 'x²': 'sq', '√x': 'sqrt', '1/x': 'inv', 'n!': 'fact', sin: 'sin', cos: 'cos', tan: 'tan', ln: 'ln' }[label]);
      else if (type === 'const') { display = label === 'π' ? String(Math.PI) : String(Math.E); fresh = true; render(); }
      else if (type === 'mem') {
        const v = parseFloat(display.replace(/,/g, ''));
        if (label === 'MC') memory = 0;
        if (label === 'MR') { display = String(memory); fresh = true; }
        if (label === 'M+') memory += v;
        if (label === 'M−') memory -= v;
        data.set('calcMemory', memory);
        render();
      }
    }

    // keyboard
    const keyHandler = (e) => {
      if (win.closed) { document.removeEventListener('keydown', keyHandler); return; }
      if (document.querySelector('#modal-root.show')) return;
      const k = e.key;
      const isFocus = document.activeElement === document.body || root.contains(document.activeElement);
      if (!isFocus) return;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); handleKey('d', k); }
      else if (k === '.' || k === ',') { e.preventDefault(); handleKey('d', '.'); }
      else if (k === '+') { e.preventDefault(); handleKey('op', '+'); }
      else if (k === '-') { e.preventDefault(); handleKey('op', '−'); }
      else if (k === '*') { e.preventDefault(); handleKey('op', '×'); }
      else if (k === '/') { e.preventDefault(); handleKey('op', '÷'); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); handleKey('eq'); }
      else if (k === 'Escape') { e.preventDefault(); clearAll(); }
      else if (k === 'Backspace') { e.preventDefault(); display = display.length > 1 ? display.slice(0, -1) : '0'; render(); }
      else if (k === '%') { e.preventDefault(); handleKey('fn', 'pct'); }
    };
    document.addEventListener('keydown', keyHandler);

    const copy = () => copyText(display);
    const clearEvent = () => clearAll();
    const viewEvent = (e) => { sci = e.detail === 'sci'; renderKeys(); win.setTitle(sci ? 'Calculator — Scientific' : 'Calculator'); };
    window.addEventListener('canopy:calc-copy', copy);
    window.addEventListener('canopy:calc-clear', clearEvent);
    window.addEventListener('canopy:calc-view', viewEvent);
    win.onClose(() => {
      document.removeEventListener('keydown', keyHandler);
      window.removeEventListener('canopy:calc-copy', copy);
      window.removeEventListener('canopy:calc-clear', clearEvent);
      window.removeEventListener('canopy:calc-view', viewEvent);
    });

    renderKeys();
    renderTape();
    render();
  },
};
