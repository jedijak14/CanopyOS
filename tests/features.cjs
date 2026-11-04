const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8').replace('<script src="vendor/holidays.min.js"></script>', () => '<script>' + fs.readFileSync('vendor/holidays.min.js', 'utf8') + '</script>').replace('<script src="locales/desktop.js"></script>', () => '<script>' + fs.readFileSync('locales/desktop.js', 'utf8') + '</script>').replace('<script src="apps/packages.js"></script>', () => '<script>' + fs.readFileSync('apps/packages.js','utf8') + '</script>').replace('<script src="apps/creative.js"></script>', () => '<script>' + fs.readFileSync('apps/creative.js','utf8') + '</script>');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...args) => errors.push(args.join(' ')));
const dom = new JSDOM(html, { url:'https://canopy.test/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(w) {
    w.matchMedia = () => ({ matches:true, addEventListener() {} });
    w.HTMLCanvasElement.prototype.getContext = () => null;
    w.HTMLMediaElement.prototype.pause = () => {};
    w.fetch = async () => ({ok:false});
  }
});
const w = dom.window, run = code => w.eval(code), wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(30);
  assert.ok(w.document.querySelector('.hello-continue'), 'first launch shows hello');
  w.document.querySelector('.hello-continue').click(); await wait(10);
  assert.equal(run('OS.phase'), 'login');
  assert.equal(run('helloLanguageAt(18)[1]'), 'es');
  assert.equal(run('helloLanguageAt(49)[1]'), 'ar');
  assert.equal(run('helloLanguageAt(129)[1]'), 'sk');
  assert.ok(run('HELLO_LANGUAGES.every(x => SETUP_TEXT[x[1]])'), 'every greeting has localized first-profile setup');
  run("setWelcomeLanguage('es'); renderLogin()");
  assert.match(w.document.querySelector('.login-form').textContent, /Crear e iniciar sesión/);
  assert.equal(w.document.documentElement.lang, 'es');
  run(`signIn(Users.create({name:'Feature Tester',password:'',avatar:'🌿',color:'#34d399'})); setPhase('desktop'); renderDesktop(); showReleaseIfNeeded();`);
  assert.ok(w.document.querySelector('#whats-new'), 'unseen release is shown');
  assert.notEqual(run(`store.get('release.seen.' + OS.user.id, '')`), run('RELEASE.id'));
  w.document.querySelector('#whats-new button').click();
  assert.equal(run(`store.get('release.seen.' + OS.user.id, '')`), run('RELEASE.id'));
  run('showReleaseIfNeeded()');
  assert.equal(w.document.querySelector('#whats-new'), null, 'release appears once per profile');
  run('showWhatsNew()');
  assert.ok(w.document.querySelector('#whats-new'), 'release can be reopened');
  w.document.querySelector('#whats-new button').click();
  run(`openApp('notes',{newNote:true});`);
  const title = w.document.querySelector('.note-title'), note = w.document.querySelector('.note-body');
  title.value = 'A speech'; title.dispatchEvent(new w.Event('input', {bubbles:true}));
  note.value = 'Hello from my private note'; note.dispatchEvent(new w.Event('input', {bubbles:true}));
  const id = run('openFern()');
  assert.equal(run(`OS.windows.find(w=>w.id===${JSON.stringify(id)}).y`),38, 'Fern opens as a top overlay');
  assert.match(w.document.querySelector('.fern-awareness').textContent, /on.*sent/);
  assert.equal(w.document.querySelector('.fern-live-toggle'),null);
  run(`window.__requests=[]; fernAskLLM = async (history, chunk, context) => { window.__requests.push({history:JSON.parse(JSON.stringify(history)),context}); return {reply:'Done'}; };`);
  function ask(q) {
    const input = w.document.querySelector('.fern-inputbar input'); input.value=q; input.dispatchEvent(new w.Event('input'));
    w.document.querySelector('.fern-inputbar').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  }
  ask('Summarize this'); await wait(20);
  assert.equal(run('__requests[0].context'), true);
  assert.match(run('__requests[0].history.at(-1).content'), /Hello from my private note/);
  assert.match(w.document.querySelector('.fern-bot:last-child .fern-response-state').textContent,/Ready/);
  run('updateSettings({fernScreenAwareness:false})');
  ask('Another question'); await wait(20);
  assert.equal(run('__requests[1].context'), false);
  assert.doesNotMatch(run('JSON.stringify(__requests[1].history)'), /Hello from my private note/, 'screen text is not retained in later history');
  assert.match(w.document.querySelector('.fern-awareness').textContent,/off/);
  run(`updateSettings({fernScreenAwareness:true}); openApp('reminders'); openFern();`);
  ask('What is on screen?');await wait(20);
  assert.match(run('__requests[2].history.at(-1).content'),/CanopyOS app: Reminders/);
  run(`window.matchMedia = () => ({matches:false, addEventListener(){}}); restart();`);
  assert.equal(run('OS.phase'), 'boot');
  assert.notEqual(w.document.querySelector('#hello').style.display, 'none', 'restart displays hello');
  assert.equal(run('OS.windows.length'), 0, 'restart tears down old windows immediately');
  w.document.querySelector('.hello-continue').click(); await wait(550);
  assert.equal(run('OS.phase'), 'login', 'restart continues to login');
  const mediaDom = new JSDOM(html, {url:'https://video.canopy.test/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(win) {
      win.matchMedia = () => ({matches:false, addEventListener(){}});
      win.fetch = async () => ({ok:false});
      Object.defineProperty(win.HTMLMediaElement.prototype, 'readyState', {get:() => 4});
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
      win.HTMLMediaElement.prototype.pause = () => {};
      win.HTMLCanvasElement.prototype.getContext = () => ({clearRect(){}, drawImage(){}, getImageData(){return {data:new Uint8ClampedArray(740*210*4)};}, putImageData(){}});
    }
  });
  try {
    await wait(50);
    const media = mediaDom.window.document.querySelector('#hello video');
    media.currentTime = 17;
    await wait(100);
    assert.equal(mediaDom.window.document.querySelector('.hello-label').textContent, 'Primeros pasos');
    mediaDom.window.document.dispatchEvent(new mediaDom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await wait(550);
    assert.equal(mediaDom.window.document.documentElement.lang, 'es', 'Enter selects the currently displayed greeting');
    assert.match(mediaDom.window.document.querySelector('.login-form').textContent, /Crear e iniciar sesión/);
    let reached = false;
    mediaDom.window.document.addEventListener('keydown', () => { reached = true; });
    mediaDom.window.document.dispatchEvent(new mediaDom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    assert.equal(reached, true, 'hello keyboard handler is removed after continuing');
  } finally { mediaDom.window.close(); }
  assert.deepEqual(errors, []);
  console.log('Fern and release feature tests passed.');
})().catch(e => {console.error(e); process.exitCode=1;}).finally(() => dom.window.close());
