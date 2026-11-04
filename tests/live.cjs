const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8')
  .replace('<script src="vendor/holidays.min.js"></script>', () => '<script>' + fs.readFileSync('vendor/holidays.min.js','utf8') + '</script>')
  .replace('<script src="locales/desktop.js"></script>', () => '<script>' + fs.readFileSync('locales/desktop.js','utf8') + '</script>').replace('<script src="apps/packages.js"></script>', () => '<script>' + fs.readFileSync('apps/packages.js','utf8') + '</script>').replace('<script src="apps/creative.js"></script>', () => '<script>' + fs.readFileSync('apps/creative.js','utf8') + '</script>');
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError', e=>errors.push(e.message)); vc.on('error', (...e)=>errors.push(e.join(' ')));
const dom = new JSDOM(html, {url:'https://canopy.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:true,addEventListener(){}}); w.fetch=async()=>({ok:false});
  w.HTMLCanvasElement.prototype.getContext=()=>null; w.HTMLMediaElement.prototype.pause=()=>{};
  w.__recognizers=[]; w.__utterances=[]; w.__cancels=0;
  w.SpeechRecognition=class {
    constructor(){w.__recognizers.push(this); this.aborted=false;}
    start(){this.started=true;}
    abort(){this.aborted=true; if(this.onend)this.onend();}
    stop(){if(this.onend)this.onend();}
    say(text){const part=[{transcript:text}];part.isFinal=true;this.onresult({results:[part]});this.onend();}
  };
  w.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  w.speechSynthesis={cancel(){w.__cancels++;},getVoices(){return [{lang:'en-US'}];},speak(u){w.__utterances.push(u); if(u.onstart)u.onstart();}};
}});
const w=dom.window, run=s=>w.eval(s), wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await wait(30); w.document.querySelector('.hello-continue').click(); await wait(10);
 run(`signIn(Users.create({name:'Tester',password:'',avatar:'🌿',color:'#34d399'})); setPhase('desktop'); renderDesktop(); openApp('fern');
   OS.settings.voiceReplies=false; window.__calls=[]; fernLocal=async()=>null; fernAskLLM=async h=>{__calls.push(JSON.parse(JSON.stringify(h)));return {reply:'Hello back'};};`);
 await wait(20);
 const button=w.document.querySelector('.fern-live-toggle'); const hint=w.document.querySelector('.fern-live-hint');
 assert.equal(button.disabled,false); assert.equal(button.getAttribute('aria-pressed'),'false');
 assert.match(hint.textContent,/browser/); assert.equal(w.__recognizers.length,0,'does not listen without consent');
 run(`setWelcomeLanguage('es')`); await wait(20);
 assert.equal(button.textContent,'Iniciar Fern Live'); assert.match(hint.textContent,/Conversación manos libres/);
 run(`setWelcomeLanguage('en')`); await wait(20);
 button.click(); assert.equal(button.getAttribute('aria-pressed'),'true'); assert.match(hint.textContent,/microphone is on/i);
 let r=w.__recognizers.at(-1); assert.equal(r.started,true); r.say('hello there'); await wait(30);
 assert.equal(run('__calls.length'),1); assert.equal(run('__calls[0].at(-1).content'),'hello there');
 assert.equal(w.__utterances.length,1,'Live speaks despite the ordinary voice-replies setting');
 assert.match(hint.textContent,/microphone is paused/i); assert.equal(w.__recognizers.length,1,'does not listen to its own reply');
 w.__utterances.at(-1).onend(); await wait(550); assert.equal(w.__recognizers.length,2,'automatically listens for the next turn');
 r=w.__recognizers.at(-1); r.say('and then what'); await wait(30);
 assert.equal(run('__calls.length'),2); assert.equal(run('__calls[1].length'),3,'conversation history is preserved');
 assert.equal(w.__utterances.length,2);
 const utterance=w.__utterances.at(-1); button.click(); assert.equal(button.getAttribute('aria-pressed'),'false'); utterance.onend(); await wait(550);
 assert.equal(w.__recognizers.length,2,'stopping prevents a stale speech callback restarting the mic');
 // A stopped pending answer may be displayed but must not speak or restart listening.
 run(`fernAskLLM=()=>new Promise(resolve=>window.__resolve=resolve)`); button.click(); r=w.__recognizers.at(-1); r.say('slow question'); await wait(20);
 button.click(); assert.equal(button.getAttribute('aria-pressed'),'false'); run(`__resolve({reply:'Late answer'})`); await wait(550);
 assert.equal(w.__utterances.length,2); assert.equal(w.__recognizers.length,3);
 // Recognition permission errors end the session rather than looping.
 button.click(); r=w.__recognizers.at(-1); r.onerror({error:'not-allowed'}); await wait(20);
 assert.equal(button.getAttribute('aria-pressed'),'false'); assert.match(hint.textContent,/permission was denied/i); assert.equal(r.aborted,true);
 r.onend(); await wait(550); assert.equal(w.__recognizers.length,4);
 // A silent recognition result can retry; manual stop cancels the timer.
 button.click(); r=w.__recognizers.at(-1); r.onerror({error:'no-speech'}); r.onend(); button.click(); await wait(550);
 assert.equal(w.__recognizers.length,5);
 // Hiding the desktop ends the session and aborts microphone access.
 button.click(); r=w.__recognizers.at(-1); Object.defineProperty(w.document,'hidden',{value:true,configurable:true}); w.document.dispatchEvent(new w.Event('visibilitychange'));
 assert.equal(button.getAttribute('aria-pressed'),'false'); assert.equal(r.aborted,true); assert.match(hint.textContent,/hidden/);
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
 // Starting Live while a one-shot microphone session is active replaces it safely.
 w.document.querySelector('.fern-round.mic').click(); const single=w.__recognizers.at(-1); assert.equal(single.started,true);
 button.click(); assert.equal(single.aborted,true); r=w.__recognizers.at(-1); assert.notEqual(r,single); assert.equal(button.getAttribute('aria-pressed'),'true');
 run(`minimizeWindow(OS.windows.find(w=>w.app==='fern').id)`); assert.equal(r.aborted,true); assert.equal(button.getAttribute('aria-pressed'),'false');
 run(`restoreWindow(OS.windows.find(w=>w.app==='fern').id)`); await wait(20);
 button.click(); r=w.__recognizers.at(-1); run(`closeWindow(OS.windows.find(w=>w.app==='fern').id)`); await wait(600);
 assert.equal(r.aborted,true,'closing the window stops recognition'); assert.equal(w.__recognizers.length,9);
 assert.deepEqual(errors,[]); console.log('Fern Live lifecycle tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
