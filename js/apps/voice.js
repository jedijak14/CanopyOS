/* CanopyOS — Voice Memos (microphone when available, simulated otherwise) */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, uid, fmtDate } from '../core/util.js';
import { notify } from '../core/notify.js';
import { confirmModal } from '../ui/modal.js';

export default {
  id: 'voice',
  name: 'Voice Memos',
  icon: 'voice',
  colors: ['#ff5e57', '#b3221c'],
  width: 760, height: 560,
  keywords: ['recording', 'microphone', 'audio', 'memo'],
  menus: () => [
    { label: 'File', items: [{ label: 'New Recording', shortcut: '⌘N', action: () => window.dispatchEvent(new CustomEvent('canopy:vm-rec')) }] },
  ],

  mount({ root, win }) {
    let memos = data.get('voiceMemos', [
      { id: 'v1', name: 'Trail idea', duration: 42, date: Date.now() - 86400000 * 2, transcript: 'Record a series about the understory — the layer nobody films.' },
      { id: 'v2', name: 'Dock tuning', duration: 18, date: Date.now() - 3600000 * 5, transcript: 'Cosine falloff at 0.42 feels right. Try a narrower spread on wide screens.' },
    ]);
    let recording = false;
    let recStart = 0;
    let recTimer = null;
    let stream = null;
    let recorder = null;
    let chunks = [];
    let audioCtx = null;
    let analyser = null;
    let levels = new Array(40).fill(0);
    let raf = null;
    let playingId = null;
    let playTimer = null;
    let audioEl = null;

    root.innerHTML = `<div class="voice">
      <div class="voice-wave-wrap">
        <canvas class="voice-wave" data-wave width="600" height="120"></canvas>
        <div class="voice-timer" data-timer>00:00</div>
        <div class="voice-status tiny" data-status>Ready</div>
      </div>
      <div class="voice-controls">
        <button class="voice-rec" data-rec aria-label="Record"><span></span></button>
        <div class="tiny muted">Click to record · click again to stop</div>
      </div>
      <div class="voice-list-head"><b>Recordings</b><span class="spacer"></span><span class="tiny muted" data-count></span></div>
      <div class="voice-list scroll-thin" data-list></div>
    </div>`;

    const canvas = root.querySelector('[data-wave]');
    const ctx = canvas.getContext('2d');
    const timerEl = root.querySelector('[data-timer]');
    const statusEl = root.querySelector('[data-status]');
    const listEl = root.querySelector('[data-list]');
    const recBtn = root.querySelector('[data-rec]');

    const persist = () => data.set('voiceMemos', memos);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    function drawWave() {
      const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = 120 * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      const barW = w / levels.length;
      levels.forEach((v, i) => {
        const bh = Math.max(2, v * h * 0.85);
        const grad = ctx.createLinearGradient(0, h / 2 - bh / 2, 0, h / 2 + bh / 2);
        grad.addColorStop(0, recording ? '#ff5e57' : 'rgba(140,150,165,.55)');
        grad.addColorStop(1, recording ? '#b3221c' : 'rgba(140,150,165,.3)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(i * barW + barW * 0.2, h / 2 - bh / 2, barW * 0.6, bh, 2);
        ctx.fill();
      });
    }

    function animate() {
      if (analyser) {
        const arr = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(arr);
        levels.shift();
        levels.push(Math.min(1, arr.slice(0, 12).reduce((a, b) => a + b, 0) / 12 / 160));
      } else if (recording) {
        levels.shift();
        levels.push(0.1 + Math.random() * 0.7);
      } else {
        levels = levels.map((v) => v * 0.9);
      }
      drawWave();
      raf = requestAnimationFrame(animate);
    }
    animate();

    function renderList() {
      root.querySelector('[data-count]').textContent = `${memos.length} recording${memos.length === 1 ? '' : 's'}`;
      listEl.innerHTML = memos.map((m) => `<div class="voice-item ${playingId === m.id ? 'playing' : ''}" data-id="${m.id}">
        <button class="voice-play" data-play="${m.id}" aria-label="Play">${glyph(playingId === m.id ? 'pause' : 'play', 14, 2.2)}</button>
        <div class="voice-item-main"><b>${escapeHtml(m.name)}</b><small>${fmtDate(new Date(m.date), { year: true })} · ${fmt(m.duration)}</small>
          ${m.transcript ? `<div class="tiny muted voice-transcript">“${escapeHtml(m.transcript)}”</div>` : ''}</div>
        <div class="voice-bars">${Array.from({ length: 14 }, (_, i) => `<i style="height:${20 + Math.abs(Math.sin(i * 2.1 + m.duration)) * 70}%"></i>`).join('')}</div>
        <button class="icon-btn" data-rename="${m.id}" title="Rename">${glyph('textedit', 13, 1.9)}</button>
        <button class="icon-btn" data-del="${m.id}" title="Delete">${glyph('trash', 13, 1.9)}</button>
      </div>`).join('') || `<div class="empty-state">${glyph('voice', 40)}<div>No recordings yet</div></div>`;
      listEl.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => playMemo(b.dataset.play)));
      listEl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
        const id = b.dataset.del;
        const ok = await confirmModal({ title: 'Delete recording?', body: 'This memo will be permanently removed.', okLabel: 'Delete' });
        if (!ok) return;
        stopPlayback();
        memos = memos.filter((m) => m.id !== id);
        persist();
        renderList();
        sound.play('trash');
      }));
      listEl.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', async () => {
        const m = memos.find((x) => x.id === b.dataset.rename);
        const { promptModal } = await import('../ui/modal.js');
        const name = await promptModal({ title: 'Rename Recording', value: m.name, okLabel: 'Rename' });
        if (name) { m.name = name; persist(); renderList(); }
      }));
    }

    function stopPlayback() {
      playingId = null;
      clearInterval(playTimer);
      playTimer = null;
      if (audioEl) { audioEl.pause(); audioEl = null; }
      timerEl.textContent = '00:00';
      statusEl.textContent = 'Ready';
      renderList();
    }

    function playMemo(id) {
      const m = memos.find((x) => x.id === id);
      if (!m) return;
      if (playingId === id) { stopPlayback(); return; }
      stopPlayback();
      playingId = id;
      renderList();
      statusEl.textContent = `Playing “${m.name}”`;
      let pos = 0;
      if (m.blobUrl) {
        audioEl = new Audio(m.blobUrl);
        audioEl.play().catch(() => {});
        audioEl.onended = () => stopPlayback();
      }
      playTimer = setInterval(() => {
        pos += 1;
        timerEl.textContent = fmt(pos);
        if (pos >= m.duration) stopPlayback();
        if (!m.blobUrl) {
          levels.shift();
          levels.push(0.2 + Math.random() * 0.6);
        }
      }, 1000);
      if (!m.blobUrl) sound.play('pop');
    }

    async function startRecording() {
      recording = true;
      recStart = Date.now();
      recBtn.classList.add('recording');
      statusEl.textContent = 'Recording…';
      timerEl.textContent = '00:00';
      chunks = [];
      recTimer = setInterval(() => {
        timerEl.textContent = fmt((Date.now() - recStart) / 1000);
      }, 250);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.start();
        statusEl.textContent = 'Recording with microphone…';
      } catch (e) {
        statusEl.textContent = 'Recording (microphone unavailable — simulated)';
        stream = null;
      }
    }

    function stopRecording() {
      recording = false;
      recBtn.classList.remove('recording');
      clearInterval(recTimer);
      const duration = Math.max(1, Math.round((Date.now() - recStart) / 1000));
      const finish = (blobUrl) => {
        const memo = { id: uid('v'), name: `New Recording ${memos.length + 1}`, duration, date: Date.now(), blobUrl, transcript: '' };
        memos.unshift(memo);
        persist();
        renderList();
        timerEl.textContent = '00:00';
        statusEl.textContent = 'Saved';
        sound.play('success');
        notify.post({ title: 'Voice Memo saved', body: `${memo.name} · ${fmt(duration)}`, icon: 'voice', colors: ['#ff5e57', '#b3221c'], app: 'Voice Memos', appId: 'voice', silent: true });
      };
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          finish(URL.createObjectURL(blob));
          stream?.getTracks().forEach((t) => t.stop());
          audioCtx?.close();
          analyser = null;
          recorder = null;
          stream = null;
        };
        recorder.stop();
      } else {
        finish(null);
      }
    }

    recBtn.addEventListener('click', () => {
      if (recording) stopRecording(); else startRecording();
    });
    window.addEventListener('canopy:vm-rec', () => { if (!recording) startRecording(); });

    renderList();
    win.onClose(() => {
      cancelAnimationFrame(raf);
      clearInterval(recTimer);
      clearInterval(playTimer);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
      if (audioEl) audioEl.pause();
    });
    const sub = data.subscribe('voiceMemos', (list) => { memos = list; renderList(); });
    win.onClose(() => sub());
  },
};
