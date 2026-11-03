/* Live, low-cost animated wallpaper renderer. CSS provides the original scene artwork;
   this transparent Canvas layer adds real per-scene movement without downloading media. */
import { store } from './store.js';

const FRAME_MS = 1000 / 30;
const MAX_DPR = 1.5;

export function initLiveWallpaper() {
  const host = document.getElementById('wallpaper');
  if (!host || host.querySelector('#live-wallpaper')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'live-wallpaper';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let seed = 0;
  let particles = [];
  let systemReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const rgba = (color, alpha) => `rgba(${color},${Math.max(0, Math.min(1, alpha))})`;

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width || window.innerWidth);
    height = Math.max(1, rect.height || window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const density = store.get('wallpaperLowPower') ? 22 : Math.round(40 + store.get('wallpaperIntensity', 70) * .65);
    particles = Array.from({ length: density }, (_, i) => ({
      x: hash(i + 1), y: hash(i + 59), size: .6 + hash(i + 99) * 2.4,
      speed: .12 + hash(i + 147) * .58, sway: .04 + hash(i + 211) * .12,
      phase: hash(i + 263) * Math.PI * 2, kind: i % 3,
    }));
    paint(0, false);
  }

  function drawAurora(power, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let band = 0; band < 5; band++) {
      const baseY = height * (.23 + band * .052);
      ctx.beginPath();
      for (let x = -8; x <= width + 8; x += 8) {
        const wave = Math.sin(x * (.0032 + band * .00035) + t * (.45 + band * .08) + band) * height * .07;
        const ripple = Math.sin(x * .009 - t * .36 + band * 1.4) * height * .02;
        const y = baseY + wave + ripple;
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height * .76); ctx.lineTo(0, height * .76); ctx.closePath();
      const grad = ctx.createLinearGradient(0, height * .17, 0, height * .78);
      grad.addColorStop(0, rgba(band % 2 ? '117,255,210' : '138,128,255', 0));
      grad.addColorStop(.48, rgba(band % 2 ? '75,240,190' : '101,148,255', power * (.095 + .025 * Math.sin(t + band))));
      grad.addColorStop(1, rgba('25,42,88', 0));
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.restore();
  }

  function drawOcean(power, t) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let band = 0; band < 7; band++) {
      const y0 = height * (.56 + band * .055);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 6) {
        const y = y0 + Math.sin(x * .006 + t * (.55 + band * .04) + band) * height * .015
          + Math.sin(x * .014 - t * .28) * height * .006;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(band % 2 ? '151,241,255' : '94,209,235', power * (.13 - band * .009));
      ctx.lineWidth = 1 + band * .2; ctx.stroke();
    }
    const sunX = width * (.73 + Math.sin(t * .08) * .035);
    const sunY = height * (.25 + Math.sin(t * .16) * .018);
    const glow = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, height * .16);
    glow.addColorStop(0, rgba('255,239,194', power * .24)); glow.addColorStop(1, rgba('255,239,194', 0));
    ctx.fillStyle = glow; ctx.fillRect(sunX - height * .16, sunY - height * .16, height * .32, height * .32);
    ctx.restore();
  }

  function drawSunset(power, t) {
    const sunX = width * (.72 + Math.sin(t * .045) * .055);
    const sunY = height * (.35 + Math.sin(t * .09) * .025);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, height * .23);
    halo.addColorStop(0, rgba('255,174,105', power * .25)); halo.addColorStop(1, rgba('255,105,142', 0));
    ctx.fillStyle = halo; ctx.fillRect(sunX - height * .24, sunY - height * .24, height * .48, height * .48);
    ctx.fillStyle = rgba('255,215,154', power * .2); ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(width, height) * .045, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticles(power, t, scene) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    particles.forEach((p, i) => {
      const rise = (p.y - t * p.speed * (scene === 'forest' ? .018 : .01) + 10) % 1;
      const x = (p.x + Math.sin(t * .27 + p.phase) * p.sway + 1) % 1;
      const y = rise;
      const shimmer = .35 + .65 * (.5 + .5 * Math.sin(t * (1.1 + p.speed) + p.phase));
      const alpha = power * shimmer * (scene === 'graphite' || scene === 'mono' ? .14 : .45);
      const hue = scene === 'bloom' ? '255,206,225' : scene === 'forest' ? '207,255,151' : '184,255,222';
      ctx.fillStyle = rgba(hue, alpha);
      if (scene === 'bloom' && p.kind === 0) {
        ctx.save(); ctx.translate(x * width, y * height); ctx.rotate(t * .18 + p.phase);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.1, p.size * .55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(x * width, y * height, p.size * (scene === 'graphite' ? .7 : 1), 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }

  function paint(time, animate = true) {
    ctx.clearRect(0, 0, width, height);
    const scene = store.get('wallpaper', 'canopy');
    const intensity = store.get('wallpaperIntensity', 70) / 100;
    const power = store.get('wallpaperLowPower') ? intensity * .5 : intensity;
    const t = time / 1000;
    if (scene === 'aurora' || scene === 'canopy' || scene === 'custom') drawAurora(power, t);
    if (scene === 'ocean') drawOcean(power, t);
    if (scene === 'sunset') drawSunset(power, t);
    drawParticles(power, t, scene);
    if (store.get('wallpaperTimeOfDay')) {
      const hour = new Date().getHours() + new Date().getMinutes() / 60;
      const dusk = Math.max(0, Math.min(1, 1 - Math.abs(hour - 19) / 2), Math.min(1, 1 - Math.abs(hour - 6) / 2));
      if (dusk > 0) { ctx.fillStyle = rgba('255,155,91', dusk * .035 * intensity); ctx.fillRect(0, 0, width, height); }
    }
  }

  function isPaused() {
    return !store.get('wallpaperLive') || store.get('reduceMotion') || systemReducedMotion
      || (store.get('wallpaperLowPower') && document.hidden)
      || (store.get('wallpaperPauseWhenHidden') && document.hidden);
  }
  function frame(now) {
    raf = 0;
    if (isPaused()) { paint(elapsed * 1000, false); return; }
    if (now - lastFrame >= FRAME_MS) {
      const dt = Math.min((now - (lastFrame || now)) / 1000, .08);
      elapsed += dt * store.get('wallpaperSpeed', 1);
      lastFrame = now;
      paint(elapsed * 1000, true);
    }
    raf = requestAnimationFrame(frame);
  }
  function update() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    lastFrame = 0;
    if (isPaused()) { paint(elapsed * 1000, false); return; }
    raf = requestAnimationFrame(frame);
  }

  const onSetting = (event) => {
    const key = event.detail?.key || '';
    if (/^(wallpaper|customWallpaper|wallpaperLive|wallpaperSpeed|wallpaperIntensity|wallpaperTimeOfDay|wallpaperPauseWhenHidden|wallpaperLowPower|reduceMotion)$/.test(key) || key === '*') update();
  };
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  motionQuery?.addEventListener?.('change', (event) => { systemReducedMotion = event.matches; update(); });
  window.addEventListener('canopy:setting', onSetting);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('resize', resize, { passive: true });
  resize();
  update();
  return { canvas, pause: () => store.set('wallpaperLive', false), resume: () => store.set('wallpaperLive', true), isRunning: () => raf !== 0 };
}
