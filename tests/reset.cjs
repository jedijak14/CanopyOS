const assert = require('node:assert/strict'), fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const {IDBFactory, IDBKeyRange} = require('fake-indexeddb');
let html = fs.readFileSync('index.html','utf8');
for(const src of ['vendor/holidays.min.js','locales/desktop.js','apps/packages.js','apps/creative.js']) html=html.replace(`<script src="${src}"></script>`,()=>`<script>${fs.readFileSync(src,'utf8')}</script>`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));async function until(fn){for(let i=0;i<150;i++){if(fn())return;await wait(20)}throw Error('Timed out');}
const vc=new VirtualConsole(),errors=[];vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'https://canopy.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){Object.defineProperty(w,'indexedDB',{value:new IDBFactory()});w.IDBKeyRange=IDBKeyRange;w.matchMedia=()=>({matches:true,addEventListener(){}});w.fetch=async()=>({ok:false});w.HTMLMediaElement.prototype.pause=()=>{};}});
const w=dom.window,run=s=>w.eval(s);
(async()=>{
 await wait(30);w.document.querySelector('.hello-continue').click();await wait(30);
 run(`signIn(Users.create({name:'Reset Tester'})); setPhase('desktop');renderDesktop();`);
 const id=run('OS.user.id');run(`store.set('notes.'+OS.user.id,[{title:'Keep until confirmed'}]);store.set('reminders.'+OS.user.id,[{title:'Remember'}]);`);w.localStorage.setItem('unrelated.site','preserved');
 await run(`PhotoStore.put({id:'photo-1',userId:${id},createdAt:Date.now(),data:'image'})`);
 await run(`CutlineStorage.put({userId:${id},version:1,media:[],clips:[]})`);
 run(`openApp('settings',{section:'about'})`);
 w.document.querySelector('#s-reset').click();assert.match(w.document.querySelector('#canopy-reset-dialog').textContent,/real Mac/);w.document.querySelector('#canopy-reset-dialog [data-cancel]').click();assert.equal(run('Users.all().length'),1);assert.equal((await run(`PhotoStore.all(${id})`)).length,1);
 w.document.querySelector('#s-reset').click();w.document.querySelector('#canopy-reset-dialog [data-confirm]').click();
 await until(()=>!w.document.querySelector('#canopy-reset-dialog'));assert.equal(w.localStorage.getItem('unrelated.site'),'preserved');assert.equal(run('Users.all().length'),0);assert.equal(run(`store.get('notes.${id}',null)`),null);assert.equal(run('factoryResetting'),false);assert.ok(w.document.querySelector('.hello-continue'));
 let databases=await w.indexedDB.databases();assert.ok(!databases.some(x=>x.name==='canopyos'||x.name==='canopy-cutline'),'both databases are deleted');
 w.document.querySelector('.hello-continue').click();await wait(30);assert.ok(w.document.querySelector('.setup-wizard'),'hello leads to first-time setup');
 // Another tab can block database deletion. The reset must report partial failure and allow a retry.
 run(`signIn(Users.create({name:'Retry Tester'}));setPhase('desktop');renderDesktop();openApp('settings',{section:'about'});`);
 const held = await new Promise((resolve,reject)=>{const request=w.indexedDB.open('canopyos',1);request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 w.document.querySelector('#s-reset').click();w.document.querySelector('#canopy-reset-dialog [data-confirm]').click();
 await until(()=>w.document.querySelector('.reset-status').textContent.includes('Close other CanopyOS tabs'));assert.equal(run('factoryResetting'),true);assert.equal(run(`store.set('late-write','should not survive')`),false);assert.match(w.document.querySelector('.reset-status').textContent,/Some data may already have been removed/);
 held.close();w.document.querySelector('#canopy-reset-dialog [data-confirm]').click();await until(()=>!w.document.querySelector('#canopy-reset-dialog'));assert.equal(run('factoryResetting'),false);assert.equal(run('Users.all().length'),0);assert.deepEqual(errors,[]);console.log('Confirmed reset erases CanopyOS local data and reopens first-time setup; blocked deletion can be retried.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
