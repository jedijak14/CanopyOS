const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
let html = fs.readFileSync('index.html','utf8');
for (const src of ['vendor/holidays.min.js','locales/desktop.js','apps/creative.js']) {
  html = html.replace(`<script src="${src}"></script>`, () => `<script>${fs.readFileSync(src,'utf8')}</script>`);
}
const errors = [], vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...args) => errors.push(args.join(' ')));
const dom = new JSDOM(html, {url:'https://canopy.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w) {
    w.matchMedia=()=>({matches:true,addEventListener(){}});
    w.HTMLCanvasElement.prototype.getContext=()=>null;
    w.HTMLMediaElement.prototype.pause=function(){};
    w.HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
    w.HTMLMediaElement.prototype.load=function(){queueMicrotask(()=>this.dispatchEvent(new w.Event('loadedmetadata')));};
    Object.defineProperty(w.HTMLMediaElement.prototype,'duration',{configurable:true,get:()=>5});
    Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});
    let objects=0;
    w.URL.createObjectURL=()=>`blob:fixture-${++objects}`;
    w.URL.revokeObjectURL=()=>{};
    w.confirm=()=>true;
    w.fetch=async()=>({ok:false});
  }
});
const w=dom.window, run=code=>w.eval(code), wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=selector=>{const node=w.document.querySelector(selector);assert.ok(node,`missing ${selector}`);node.click();};
const change=(selector,value)=>{const node=w.document.querySelector(selector);assert.ok(node,`missing ${selector}`);node.value=value;node.dispatchEvent(new w.Event('change',{bubbles:true}));};
(async()=>{
  try {
    await wait(30); click('.hello-continue'); await wait(10);
    run(`window.first=Users.create({name:'First',password:'',avatar:'🌿',color:'#34d399'}); signIn(first);setPhase('desktop');renderDesktop();
      window.savedProjects=new Map(); CutlineStorage.get=async id=>savedProjects.get(id)||null;CutlineStorage.put=async(data)=>{savedProjects.set(data.userId,data);};`);
    await wait(5); run(`window.second=Users.create({name:'Second',password:'',avatar:'🌿',color:'#34d399'})`);
    assert.equal(run(`isAppInstalled('cutline')`),false);
    assert.ok(!run(`availableAppIds().includes('cutline')`));
    run(`openApp('cutline')`); await wait(20);
    assert.ok(w.document.querySelector('.creative-store'), 'uninstalled direct launch opens the Store');
    assert.equal(w.document.querySelector('.creative-store input[type=search]').value,'cutline');
    click('.store-card [data-action]'); await wait(10);
    assert.equal(run(`isAppInstalled('cutline')`),true);
    assert.ok(run(`availableAppIds().includes('cutline')`));
    click('.store-card [data-action]'); await wait(30);
    assert.ok(w.document.querySelector('.cutline'), 'installed app opens');
    const input=w.document.querySelector('.cutline input[type=file]');
    Object.defineProperty(input,'files',{configurable:true,value:[new w.File(['video'],'test.mp4',{type:'video/mp4'})]});
    input.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(100);
    assert.equal(w.document.querySelectorAll('.cut-clip').length,1);
    change('[data-out]','4'); change('[data-title]','Sample title');
    assert.equal(w.document.querySelector('.cut-title-overlay').textContent,'Sample title');
    const seek=w.document.querySelector('.cut-transport input');seek.value='2';seek.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(20);
    click('[data-split]'); assert.equal(w.document.querySelectorAll('.cut-clip').length,2);
    click('[data-undo]');assert.equal(w.document.querySelectorAll('.cut-clip').length,1);
    click('[data-redo]');assert.equal(w.document.querySelectorAll('.cut-clip').length,2);
    click('[data-duplicate]');assert.equal(w.document.querySelectorAll('.cut-clip').length,3);
    click('.cutline [data-remove]');assert.equal(w.document.querySelectorAll('.cut-clip').length,2);
    await wait(650);
    assert.equal(run('savedProjects.get(String(first.id)).clips.length'),2);
    assert.equal(run('savedProjects.get(String(first.id)).title'),'Sample title');
    assert.equal(run(`CutlineMath.duration([{in:1,out:4},{in:0,out:2}])`),5);
    assert.equal(run(`CutlineMath.locate([{in:1,out:4},{in:0,out:2}],3.5).index`),1);
    // Generated clips are opt-in, use the auth header, and never persist the key.
    run(`window.generationRequests=[];fetch=async(url,options)=>{generationRequests.push({url:String(url),authorization:options.headers.Authorization});return {ok:true,blob:async()=>new Blob(['generated'],{type:'video/mp4'})};};`);
    assert.equal(run('generationRequests.length'),0);
    click('[data-generate]');
    const form=w.document.querySelector('.cut-modal form');
    form.querySelector('textarea').value='A drifting cloud';form.querySelector('input[type=password]').value='test-private-key';
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(100);
    assert.equal(run('generationRequests.length'),1);
    assert.equal(run('generationRequests[0].authorization'),'Bearer test-private-key');
    assert.match(run('generationRequests[0].url'),/^https:\/\/gen\.pollinations\.ai\/video\//);
    assert.doesNotMatch(run('generationRequests[0].url'),/test-private-key/);
    assert.match(run('generationRequests[0].url'),/model=google%2Fveo-3\.1-fast/);
    assert.equal(w.document.querySelectorAll('.cut-clip').length,3);
    await wait(650);
    assert.doesNotMatch(run('JSON.stringify(savedProjects.get(String(first.id)))'),/test-private-key/);
    assert.doesNotMatch(JSON.stringify(w.localStorage),/test-private-key/);
    // Focus starts the shared timer; Color Lab persists the chosen color per profile.
    run(`setAppInstalled('focus',true);setAppInstalled('colorlab',true);openApp('focus')`);await wait(20);
    click('[data-focus="25"]');assert.match(w.document.querySelector('.focus-status').textContent,/started/);
    assert.ok(run(`Timers.items.some(t=>t.label==='Focus')`));
    run(`openApp('colorlab')`);await wait(20);
    const picker=w.document.querySelector('input[type=color]');picker.value='#123456';picker.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(run(`store.get('colorlab.'+first.id)`),'#123456');
    assert.equal(w.document.querySelectorAll('.palette-swatch').length,5);
    // Closing and reopening restores a profile's clips and edits.
    run(`resetDesktop();signIn(Users.byId(first.id));setPhase('desktop');renderDesktop();openApp('cutline')`);await wait(80);
    assert.equal(w.document.querySelectorAll('.cut-clip').length,3);
    assert.equal(w.document.querySelector('[data-title]').value,'Sample title');
    run(`resetDesktop();signIn(Users.byId(second.id));setPhase('desktop');renderDesktop()`);await wait(20);
    assert.equal(run(`isAppInstalled('cutline')`),false,'installs are profile-specific');
    assert.equal(run(`store.get('colorlab.'+second.id, null)`),null);
    run(`setAppInstalled('cutline',true);openApp('cutline')`);await wait(40);
    assert.equal(w.document.querySelectorAll('.cut-clip').length,0,'projects are profile-specific');
    run(`openApp('store')`);await wait(10);
    const card=w.document.querySelector('.store-card [data-action]');assert.equal(card.textContent.trim(),'Open');
    // Uninstall doesn't silently erase locally stored project data.
    const store=w.document.querySelector('.creative-store');
    [...store.querySelectorAll('.store-nav-list button')].find(b=>b.textContent.includes('Installed')).click();
    click('.store-card [data-remove]');
    assert.equal(run(`isAppInstalled('cutline')`),false);
    assert.ok(run(`savedProjects.has(String(first.id))`));
    assert.deepEqual(errors,[]);
    console.log('Creative apps, profile isolation, editor and generation request tests passed.');
  } finally {dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
