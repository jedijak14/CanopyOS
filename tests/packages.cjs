const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
let html=fs.readFileSync('index.html','utf8');
for(const src of ['vendor/holidays.min.js','locales/desktop.js','apps/packages.js','apps/creative.js']) html=html.replace(`<script src="${src}"></script>`,()=>`<script>${fs.readFileSync(src,'utf8')}</script>`);
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...e)=>errors.push(e.join(' ')));
const dom=new JSDOM(html,{url:'https://canopy.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.matchMedia=()=>({matches:true,addEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLMediaElement.prototype.pause=()=>{};w.fetch=async()=>{w.networkCalls=(w.networkCalls||0)+1;return {ok:false};};}});
const w=dom.window,run=code=>w.eval(code),wait=ms=>new Promise(r=>setTimeout(r,ms));
function pe({plus=false,machine=0x14c,certificate=false}={}){
  const buf=Buffer.alloc(512),off=128,opt=off+24,sz=plus?240:224;
  buf.write('MZ',0,'ascii');buf.writeUInt32LE(off,0x3c);buf.write('PE\0\0',off,'binary');
  buf.writeUInt16LE(machine,off+4);buf.writeUInt16LE(1,off+6);buf.writeUInt16LE(sz,off+20);buf.writeUInt16LE(2,off+22);
  buf.writeUInt16LE(plus?0x20b:0x10b,opt);buf.writeUInt32LE(0x1234,opt+16);buf.writeUInt16LE(2,opt+68);
  buf.writeUInt32LE(16,opt+(plus?108:92));
  if(certificate){buf.writeUInt32LE(480,opt+(plus?144:128));buf.writeUInt32LE(16,opt+(plus?148:132));}
  return buf;
}
function file(buffer,name='sample.exe'){return new w.File([buffer],name,{type:'application/octet-stream'});}
(async()=>{try{
  await wait(25);w.document.querySelector('.hello-continue').click();await wait(10);
  run(`signIn(Users.create({name:'Tester'}));setPhase('desktop');renderDesktop();openApp('packages')`);await wait(25);
  assert.equal(run(`APPS.store`),undefined,'the App Store is removed');
  assert.ok(w.document.querySelector('.package-manager'));
  const parse= f=>w.inspectWindowsExecutable ? w.inspectWindowsExecutable(f) : run('inspectWindowsExecutable')(f);
  const x86=await parse(file(pe()));
  assert.equal(x86.format,'PE32');assert.equal(x86.architecture,'x86 (32-bit)');assert.equal(x86.entryPoint,'0x00001234');assert.equal(x86.subsystem,'Windows GUI');assert.equal(x86.sections,1);
  const arm=await parse(file(pe({plus:true,machine:0xaa64,certificate:true})));
  assert.equal(arm.format,'PE32+');assert.equal(arm.architecture,'ARM64');assert.match(arm.certificate,/not verified/);
  await assert.rejects(parse(file(pe(),'sample.txt')),/\.exe extension/);
  await assert.rejects(parse(file(Buffer.alloc(8))),/too small/);
  await assert.rejects(parse(file(Buffer.alloc(100))),/MZ/);
  const badOffset=pe();badOffset.writeUInt32LE(0xffffffff,0x3c);await assert.rejects(parse(file(badOffset)),/offset/);
  const nonPE=pe();nonPE.write('NOPE',128,'ascii');await assert.rejects(parse(file(nonPE)),/not a supported Windows PE/);
  const badOptional=pe();badOptional.writeUInt16LE(5000,148);await assert.rejects(parse(file(badOptional)),/optional header/);
  const badCert=pe({certificate:true});badCert.writeUInt32LE(500,128+24+128);await assert.rejects(parse(file(badCert)),/certificate directory/);
  const readSizes=[];const bytes=pe();const huge={name:'large.exe',size:1_000_000_000,slice(start,end){readSizes.push(end-start);return {arrayBuffer:async()=>Uint8Array.from(bytes.subarray(start,end)).buffer};}};
  const parsedHuge=await parse(huge);assert.equal(parsedHuge.size,1_000_000_000);assert.deepEqual(readSizes,[64,24,224],'only small header slices are read');
  const inspectButton=[...w.document.querySelectorAll('.pkg-nav-item')].find(x=>x.textContent.includes('Inspect .exe'));inspectButton.click();
  const runner=w.document.querySelector('.pkg-runner a');assert.equal(runner.href,'https://exebrowser.com/load-exe/');assert.equal(runner.target,'_blank');assert.match(w.document.querySelector('.pkg-runner').textContent,/Compatibility is limited/);
  const injectName='<img src=x onerror=alert(1)>.exe';const input=w.document.querySelector('.pkg-drop input');
  Object.defineProperty(input,'files',{configurable:true,value:[file(pe({plus:true,machine:0x8664}),injectName)]});
  const callsBefore=w.networkCalls||0;input.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(70);
  assert.equal(w.document.querySelector('.pkg-file-name').textContent,injectName);
  assert.equal(w.document.querySelector('.pkg-file-name img'),null,'file names are treated as text');
  assert.match(w.document.querySelector('.pkg-result').textContent,/PE32\+.*x64/s);
  assert.match(w.document.querySelector('.pkg-disclaimer').textContent,/cannot install or run Windows programs/);
  assert.equal(w.networkCalls||0,callsBefore,'inspection does not make network requests');
  assert.doesNotMatch(JSON.stringify(w.localStorage),/sample\.exe|onerror/,'the binary and file name are not persisted');
  const next=w.document.querySelector('.pkg-drop input');Object.defineProperty(next,'files',{configurable:true,value:[file(Buffer.alloc(100))]});next.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(50);assert.match(w.document.querySelector('.pkg-error').textContent,/MZ/);
  assert.deepEqual(errors,[]);
  console.log('Package Manager and safe, local PE inspection tests passed.');
}finally{dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
