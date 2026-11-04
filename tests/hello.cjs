const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8')
  .replace('<script src="vendor/holidays.min.js"></script>', () => '<script>' + fs.readFileSync('vendor/holidays.min.js', 'utf8') + '</script>')
  .replace('<script src="locales/desktop.js"></script>', () => '<script>' + fs.readFileSync('locales/desktop.js', 'utf8') + '</script>')
  .replace('<script src="apps/packages.js"></script>', () => '<script>' + fs.readFileSync('apps/packages.js', 'utf8') + '</script>')
  .replace('<script src="apps/creative.js"></script>', () => '<script>' + fs.readFileSync('apps/creative.js', 'utf8') + '</script>');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check){for(let i=0;i<100;i++){if(check())return;await wait(20);}throw new Error('Timed out waiting for hello state');}
function makeDOM({ready = 0, reject = false, retry = false, reduced = false} = {}) {
  const vc = new VirtualConsole(), errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, {url:'https://hello.canopy.test/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w) {
      w.__ready = ready; w.__draws = []; w.__imageSizes = [];
      w.matchMedia = () => ({matches:reduced, addEventListener(){}});
      w.fetch = async () => ({ok:false});
      const setTimeoutOriginal = w.setTimeout.bind(w);
      w.setTimeout = (fn, delay, ...args) => setTimeoutOriginal(fn, delay === 8000 ? 50 : delay, ...args);
      Object.defineProperty(w.HTMLMediaElement.prototype, 'readyState', {get(){return w.__ready;}});
      w.HTMLMediaElement.prototype.play = function(){return reject || (retry && !this.src.includes('.webm')) ? Promise.reject(new Error('codec unavailable')) : Promise.resolve();};
      w.HTMLMediaElement.prototype.pause = () => {};
      w.HTMLCanvasElement.prototype.getContext = () => ({
        drawImage(...args){w.__draws.push(args.slice(1));},
        getImageData(...args){w.__imageSizes.push(args);return {data:new Uint8ClampedArray(4)};},
        putImageData(){}
      });
    }
  });
  return {dom,w:dom.window,run:code=>dom.window.eval(code),errors};
}
(async()=>{
  const one=makeDOM();
  try {
    const {w,run}=one; await until(()=>w.document.querySelector('.hello-fallback'));
    assert.ok(w.document.querySelector('.hello-fallback'), 'a stalled video has a source-frame fallback');
    const canvas=w.document.querySelector('#hello canvas'); assert.equal(canvas.width,1480);assert.equal(canvas.height,420);
    run('__ready=4'); const video=w.document.querySelector('#hello video');video.currentTime=17;
    await until(()=>w.document.querySelector('.hello-label').textContent==='Primeros pasos');
    assert.equal(w.document.querySelector('.hello-fallback'),null,'playback recovery replaces the fallback');
    assert.equal(w.document.querySelector('.hello-label').textContent,'Primeros pasos');
    assert.deepEqual(Array.from(run('__imageSizes.at(-1)')), [0,0,1480,420]);
    assert.deepEqual(Array.from(run('__draws.at(-1)')), [220,320,1480,420,0,0,1480,420]);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await wait(550);assert.equal(w.document.documentElement.lang,'es');assert.equal(run('OS.phase'),'login');
    assert.equal(w.document.querySelector('#hello video'),null,'playback is torn down after continuing');
    assert.deepEqual(one.errors,[]);
  } finally {one.dom.window.close();}
  const two=makeDOM({reject:true});
  try {
    const {w,run}=two;await until(()=>w.document.querySelector('.hello-fallback'));
    assert.match(w.document.querySelector('.hello-fallback').getAttribute('src'),/assets\/hello\/hello\.png/);
    // An old exit timer must not hide or complete a replacement hello.
    w.document.querySelector('.hello-continue').click();
    run('window.__secondDone=0;playHello(()=>window.__secondDone++,{interactive:true})');
    await wait(550);
    assert.notEqual(w.document.querySelector('#hello').style.display,'none');
    assert.equal(w.document.querySelectorAll('.hello-continue').length,1);
    assert.equal(run('OS.phase'),'boot');
    w.document.querySelector('.hello-continue').click();await wait(550);assert.equal(run('__secondDone'),1);
    assert.deepEqual(two.errors,[]);
  } finally {two.dom.window.close();}
  const alternate=makeDOM({ready:4,retry:true});
  try { await until(()=>alternate.w.document.querySelector('#hello video')?.src.endsWith('.webm')); assert.match(alternate.w.document.querySelector('#hello video').src,/hello-1080\.webm$/); assert.equal(alternate.w.document.querySelector('.hello-fallback'),null,'unsupported MP4 uses video rather than static fallback'); assert.deepEqual(alternate.errors,[]); } finally { alternate.dom.window.close(); }
  const three=makeDOM({reduced:true});
  try {await until(()=>three.w.document.querySelector('.hello-fallback'));assert.ok(three.w.document.querySelector('.hello-fallback'));assert.equal(three.w.document.querySelector('#hello video'),null);assert.deepEqual(three.errors,[]);}
  finally {three.dom.window.close();}
  for (const asset of ['hello.png','hello-1080.webm','sc.woff2','kr.woff2','thai.woff2','devanagari.woff2','hebrew.woff2','arabic.woff2','OFL.txt','NOTICE.txt']) assert.ok(fs.existsSync('assets/hello/'+asset),asset+' is packaged');
  assert.match(fs.readFileSync('android/app/build.gradle.kts','utf8'),/from\(repoRoot\.resolve\("assets"\)\)/);
  console.log('Hello rendering, fallback, language, and cleanup tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
