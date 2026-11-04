/* CanopyOS creative apps. */
function FocusApp({body}) {
  body.innerHTML = `<div class="mini-app"><div style="font-size:11px;letter-spacing:.16em;color:#70887b;font-weight:700">CANOPY / PRODUCTIVITY</div><h1>Make space to focus.</h1><p>One thing at a time. Your sessions use CanopyOS timers, so they continue when this window closes.</p><div class="mini-card"><div style="font-size:13px;color:#75847d">CHOOSE A SESSION</div><div style="font-size:38px;font-weight:300;margin:14px 0">Time for you.</div><div class="mini-actions"><button data-focus="25">25 min focus</button><button data-focus="5">5 min break</button><button data-focus="15">15 min break</button></div><p class="focus-status" role="status">Ready when you are.</p></div><button class="btn" data-clock>Open Clock</button></div>`;
  const status = $('.focus-status',body);
  $$('[data-focus]',body).forEach(b=>{ b.onclick=()=>{ const minutes=Number(b.dataset.focus); const timer=setTimer(minutes*60, minutes===25?'Focus':'Break'); status.textContent=timer ? `${minutes}-minute ${minutes===25?'focus session':'break'} started. Manage it in Clock.` : 'Could not start a timer.'; }; });
  $('[data-clock]',body).onclick=()=>openApp('clock',{tab:'timer'});
  return {update(){},destroy(){}};
}

function ColorLabApp({body}) {
  const key = 'colorlab.' + (OS.user && OS.user.id);
  let color = store.get(key, '#6b998f');
  if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#6b998f';
  body.innerHTML = `<div class="mini-app"><div style="font-size:11px;letter-spacing:.16em;color:#70887b;font-weight:700">CANOPY / CREATIVE TOOLS</div><h1>Color Lab</h1><p>Find a starting point. Choose a base and copy a harmonious color.</p><div class="mini-card"><label style="display:flex;align-items:center;gap:12px;font-weight:600">Base color <input type="color" aria-label="Base color"></label><div class="palette-strip"></div><p class="palette-status" role="status">Select a swatch to copy its hex value.</p></div></div>`;
  const picker=$('input',body),strip=$('.palette-strip',body),status=$('.palette-status',body); picker.value=color;
  function hsl(hex) {
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min,l=(max+min)/2;
    let h=0; if(delta) { if(max===rgb[0]) h=((rgb[1]-rgb[2])/delta)%6; else if(max===rgb[1]) h=(rgb[2]-rgb[0])/delta+2; else h=(rgb[0]-rgb[1])/delta+4; h=(h*60+360)%360; }
    return [h, delta ? delta/(1-Math.abs(2*l-1)) : 0,l];
  }
  function hex(h,s,l) {
    const a=s*Math.min(l,1-l), f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
    return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
  }
  function paint(){
    const [h,s,l]=hsl(color), colors=[hex((h+320)%360,s,l),hex((h+340)%360,s,l),color,hex((h+20)%360,s,l),hex((h+40)%360,s,l)]; strip.innerHTML='';
    colors.forEach(value=>{const b=el('button','palette-swatch');b.style.background=value; const [r,g,bl]=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)); b.style.color=(r*.299+g*.587+bl*.114)>155?'#17231e':'#fff';b.textContent=value.toUpperCase();b.title='Copy '+value;b.onclick=async()=>{try{await navigator.clipboard.writeText(value);status.textContent=`Copied ${value.toUpperCase()}.`;}catch{status.textContent=`Copy this color: ${value.toUpperCase()}`;}};strip.appendChild(b);});
  }
  picker.oninput=()=>{color=picker.value;store.set(key,color);paint();}; paint();
  return {update(){},destroy(){}};
}

/* Local, single-project-per-profile storage. Blobs are kept in IndexedDB, not
   localStorage or uploaded. A failed save is reported rather than concealed. */
const CutlineStorage = {
  open() { return new Promise(resolve => {
    if (!window.indexedDB) return resolve(null);
    let req; try {req=indexedDB.open('canopy-cutline',1);} catch {return resolve(null);}
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects',{keyPath:'userId'});};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>resolve(null); req.onblocked=()=>resolve(null);
  }); },
  async get(userId) {const db=await this.open();if(!db)return null;return new Promise(resolve=>{try{const tx=db.transaction('projects','readonly'), req=tx.objectStore('projects').get(String(userId));req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();}catch{db.close();resolve(null);}});},
  async put(project) {const db=await this.open();if(!db)throw new Error('Local project storage is unavailable.');if(!Users.byId(Number(project.userId))){db.close();return;}return new Promise((resolve,reject)=>{try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(project);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Could not save the project. Check browser storage.'));};tx.onabort=()=>{db.close();reject(new Error('Project save was interrupted.'));};}catch(e){db.close();reject(e);}});},
  async del(userId) {const db=await this.open();if(!db)return;return new Promise((resolve,reject)=>{try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').delete(String(userId));tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('Could not delete the project.'));};}catch(e){db.close();reject(e);}});}
};

const CutlineMath = {
  duration(clips) {return clips.reduce((sum,c)=>sum+Math.max(0,c.out-c.in),0);},
  locate(clips, time) {let offset=0;for(let i=0;i<clips.length;i++){const len=clips[i].out-clips[i].in;if(time<offset+len || i===clips.length-1)return {index:i, offset, local:clips[i].in+Math.max(0,Math.min(len,time-offset))};offset+=len;}return null;},
  split(clips, index, sourceTime, newId) {const clip=clips[index];if(!clip||sourceTime<=clip.in+.05||sourceTime>=clip.out-.05)return null;const next=clips.map(c=>({...c}));next.splice(index,1,{...clip,out:sourceTime},{...clip,id:newId,in:sourceTime});return next;},
};

function CutlineApp({win, body}) {
  let alive=true, ready=false, media=[], clips=[], selected=null, playhead=0, playing=false, currentIndex=-1, sourceId=null, seekVersion=0;
  let title='', filter='none', volume=1, ratio='16:9', history=[], future=[], saving=Promise.resolve(), exportCancel=false, exporting=false, cancelExportWait=null, generation=null;
  const userId=String(OS.user && OS.user.id), FILTERS={none:'none',mono:'grayscale(1)',warm:'sepia(.28) saturate(1.16)',cool:'saturate(.9) hue-rotate(14deg)',cinema:'contrast(1.12) saturate(.86)'};
  body.innerHTML=`<div class="cutline">
    <header class="cut-top" data-drag="1"><strong>Cutline</strong><span class="tag">VIDEO EDITOR</span><span class="spacer"></span><button class="cut-btn" data-new>New project</button><button class="cut-btn" data-fern>Ask Fern</button><button class="cut-btn" data-generate>Create with AI</button><button class="cut-btn accent" data-export>Export</button></header>
    <div class="cut-main"><aside class="cut-panel left"><div class="cut-panel-head">Media <span data-media-count>0</span></div><label class="cut-import">＋ Import video<small>MP4 or WebM · stays on this device</small><input type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden></label><div class="cut-media-list"></div><div style="padding:0 15px;color:#8d99a9;font-size:11px;line-height:1.5">Click an imported clip to add it to your timeline.</div></aside>
    <section class="cut-preview-pane"><div class="cut-preview-header">PREVIEW <span style="flex:1"></span><span data-ratio-label>16:9</span></div><div class="cut-stage-wrap"><div class="cut-stage"><video playsinline preload="metadata"></video><div class="cut-title-overlay"></div><div class="cut-placeholder"><strong>Every story starts somewhere.</strong><small>Import a video to begin editing. Your original files are never changed.</small></div></div></div><div class="cut-transport"><button class="cut-btn" data-play aria-label="Play">▶</button><input type="range" min="0" max="0" value="0" step="0.01" aria-label="Timeline position"><span class="cut-time">00:00 / 00:00</span></div></section>
    <aside class="cut-panel right"><div class="cut-panel-head">Inspector <span>PROJECT</span></div><div class="cut-inspector"><label>Title overlay<input data-title placeholder="Add a title" maxlength="100"></label><label>Aspect ratio<select data-ratio><option value="16:9">Landscape · 16:9</option><option value="9:16">Portrait · 9:16</option><option value="1:1">Square · 1:1</option></select></label><label>Color look<select data-filter><option value="none">Original</option><option value="cinema">Cinema</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="mono">Black & white</option></select></label><label>Volume<input data-volume type="range" min="0" max="1" step="0.05" value="1"></label><div class="cut-inspector-clip"></div><p class="info">Trim and split without changing your original files. WebM export runs in real time.</p></div></aside></div>
    <section class="cut-timeline"><div class="cut-timeline-head"><strong>Timeline</strong><button class="cut-btn" data-undo title="Undo">Undo</button><button class="cut-btn" data-redo title="Redo">Redo</button><span class="spacer"></span><button class="cut-btn" data-left aria-label="Move clip earlier">←</button><button class="cut-btn" data-right aria-label="Move clip later">→</button><button class="cut-btn" data-split>Split</button><button class="cut-btn" data-duplicate>Duplicate</button><button class="cut-btn danger" data-remove>Remove</button></div><div class="cut-track-wrap"><div class="cut-track"></div></div><div class="cut-status" role="status">Import a clip to begin.</div></section>
  </div>`;
  const root=$('.cutline',body), video=$('video',root), stage=$('.cut-stage',root), placeholder=$('.cut-placeholder',root), overlay=$('.cut-title-overlay',root), list=$('.cut-media-list',root), track=$('.cut-track',root), inspector=$('.cut-inspector-clip',root), input=$('input[type=file]',root), range=$('.cut-transport input',root), timeLabel=$('.cut-time',root);
  const status=$('.cut-status',root), btn=key=>$(`[data-${key}]`,root), field=key=>$(`[data-${key}]`,root);
  let lastStatus='Import a clip to begin.';
  function say(message) {lastStatus=message;if(alive)status.textContent=message;}
  function format(time) {const n=Math.max(0,Math.floor(time||0));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function source(id){return media.find(m=>m.id===id);}
  function snapshot(){return {clips:clips.map(c=>({...c})),selected,title,filter,volume,ratio,playhead};}
  function restore(s){clips=s.clips.map(c=>({...c}));selected=s.selected;title=s.title;filter=s.filter;volume=s.volume;ratio=s.ratio;playhead=Math.min(s.playhead,CutlineMath.duration(clips));playing=false;video.pause();currentIndex=-1;paint();showAt(playhead,false);save();}
  function remember(){history.push(snapshot());if(history.length>40)history.shift();future=[];}
  function save() {
    const data={userId, version:1, media:media.map(m=>({id:m.id,name:m.name,duration:m.duration,blob:m.blob})),clips:clips.map(c=>({...c})),selected,title,filter,volume,ratio,playhead};
    saving=saving.then(()=>CutlineStorage.put(data)).then(()=>{if(alive)say('Project saved on this device.');}).catch(()=>{if(alive)say('Project could not be saved. Check browser storage; export before closing.');});
  }
  function markChanged(){paint();save();}
  function paintMedia(){
    list.innerHTML=''; $('[data-media-count]',root).textContent=String(media.length);
    for(const item of media){const b=el('button','cut-media-item');b.innerHTML=`<span class="cut-media-thumb">${icon('play',18)}</span><span><b>${esc(item.name)}</b><br><small>${format(item.duration)} · add to timeline</small></span>`;b.title=`Add ${item.name} to timeline`;b.onclick=()=>{remember();clips.push({id:uid(),mediaId:item.id,in:0,out:item.duration});selected=clips.at(-1).id;playhead=CutlineMath.duration(clips)-item.duration;markChanged();showAt(playhead,false);};list.appendChild(b);}
  }
  function paintTimeline(){
    const total=CutlineMath.duration(clips);range.max=String(total);range.value=String(Math.min(playhead,total));timeLabel.textContent=`${format(playhead)} / ${format(total)}`;track.innerHTML='';
    if(!clips.length){track.innerHTML='<div class="cut-track-empty">Your timeline is empty · add a clip to start</div>';}
    else clips.forEach((clip,index)=>{const item=source(clip.mediaId),b=el('button','cut-clip'+(clip.id===selected?' sel':''));b.style.setProperty('--clip-w',Math.max(86,Math.min(260,(clip.out-clip.in)*24))+'px');b.innerHTML=`<span class="n">${esc(item ? item.name : 'Missing media')}</span><small>${format(clip.out-clip.in)} · CLIP ${index+1}</small>`;b.onclick=()=>{let offset=0;for(let i=0;i<index;i++)offset+=clips[i].out-clips[i].in;selected=clip.id;playhead=offset;playing=false;video.pause();paint();showAt(playhead,false);};track.appendChild(b);});
    const index=clips.findIndex(c=>c.id===selected), enabled=index>=0;
    for(const key of ['split','duplicate','remove'])btn(key).disabled=!enabled;
    btn('left').disabled=index<=0;btn('right').disabled=!enabled||index===clips.length-1;btn('undo').disabled=!history.length;btn('redo').disabled=!future.length;btn('export').disabled=!clips.length||exporting;
    btn('play').disabled=!clips.length;btn('play').textContent=playing?'❚❚':'▶';btn('play').setAttribute('aria-label',playing?'Pause':'Play');
  }
  function paintInspector(){
    field('title').value=title;field('ratio').value=ratio;field('filter').value=filter;field('volume').value=String(volume);
    overlay.textContent=title;video.style.filter=FILTERS[filter]||'none';video.volume=volume;stage.style.aspectRatio=ratio.replace(':',' / ');$('[data-ratio-label]',root).textContent=ratio;
    const clip=clips.find(c=>c.id===selected), item=clip&&source(clip.mediaId);inspector.innerHTML='';
    if(!clip || !item){inspector.innerHTML='<p class="info">Select a clip to adjust its trim points.</p>';return;}
    inspector.innerHTML=`<div class="cut-panel-head" style="padding:0 0 10px">Selected clip</div><div class="pair"><label>In · seconds<input data-in type="number" min="0" max="${item.duration}" step="0.1" value="${clip.in.toFixed(2)}"></label><label>Out · seconds<input data-out type="number" min="0" max="${item.duration}" step="0.1" value="${clip.out.toFixed(2)}"></label></div><p class="info">${esc(item.name)} · ${format(item.duration)} source</p>`;
    $$('input',inspector).forEach(node=>{node.onchange=()=>{const newIn=Number($('[data-in]',inspector).value),newOut=Number($('[data-out]',inspector).value);if(!Number.isFinite(newIn)||!Number.isFinite(newOut)||newIn<0||newOut>item.duration||newOut-newIn<.1){say('Trim points must be within the source and at least 0.1 seconds apart.');paintInspector();return;}remember();clip.in=newIn;clip.out=newOut;playhead=Math.min(playhead,CutlineMath.duration(clips));playing=false;video.pause();markChanged();showAt(playhead,false);};});
  }
  function paint(){if(!alive)return;paintMedia();paintTimeline();paintInspector();placeholder.style.display=clips.length?'none':'';input.disabled=!ready;btn('new').disabled=!ready;btn('generate').disabled=!ready;}
  function eventOnce(element,event,timeoutMs=15000){return new Promise((resolve,reject)=>{let timer=setTimeout(()=>done(new Error('The browser could not decode the video in time.')),timeoutMs);function done(err){clearTimeout(timer);element.removeEventListener(event,ok);element.removeEventListener('error',fail);err?reject(err):resolve();}function ok(){done();}function fail(){done(new Error('This video format cannot be decoded by your browser.'));}element.addEventListener(event,ok,{once:true});element.addEventListener('error',fail,{once:true});});}
  async function showAt(time, shouldPlay){
    const current=CutlineMath.locate(clips,time); const ticket=++seekVersion;
    if(!current){video.pause();video.removeAttribute('src');video.load();sourceId=null;currentIndex=-1;return;}
    const clip=clips[current.index],item=source(clip.mediaId);if(!item){say('A source clip is missing.');return;}
    currentIndex=current.index;
    try {
      if(sourceId!==item.id){sourceId=item.id;const loaded=eventOnce(video,'loadedmetadata');video.src=item.url;video.load();await loaded;}
      else if(video.readyState<1){await eventOnce(video,'loadedmetadata');}
      if(!alive||ticket!==seekVersion)return;
      if(Math.abs(video.currentTime-current.local)>.03){const done=eventOnce(video,'seeked');video.currentTime=current.local;await done;}
      if(!alive||ticket!==seekVersion)return;
      if(shouldPlay){await video.play(); if(!alive||ticket!==seekVersion){video.pause();return;} playing=true;}else{video.pause();playing=false;}
      paintTimeline();
    }catch(e){if(alive&&ticket===seekVersion){playing=false;paintTimeline();say(e.message||'Unable to preview the clip.');}}
  }
  video.ontimeupdate=()=>{
    if(!playing||currentIndex<0||!clips[currentIndex])return;
    const clip=clips[currentIndex], offset=clips.slice(0,currentIndex).reduce((n,c)=>n+c.out-c.in,0);
    playhead=Math.min(CutlineMath.duration(clips),offset+Math.max(0,video.currentTime-clip.in));
    if(video.currentTime>=clip.out-.035){if(currentIndex<clips.length-1){playing=false;playhead=offset+clip.out-clip.in;showAt(playhead,true);}else{playing=false;video.pause();playhead=CutlineMath.duration(clips);}}
    paintTimeline();
  };
  video.onended=()=>{if(playing&&currentIndex>=0){let t=clips.slice(0,currentIndex+1).reduce((n,c)=>n+c.out-c.in,0);if(currentIndex<clips.length-1){playing=false;playhead=t;showAt(t,true);}else{playing=false;playhead=CutlineMath.duration(clips);paintTimeline();}}};
  btn('play').onclick=()=>{if(playing){playing=false;video.pause();paintTimeline();}else{if(playhead>=CutlineMath.duration(clips)-.02)playhead=0;showAt(playhead,true);}};
  range.oninput=()=>{playing=false;video.pause();playhead=Number(range.value);const hit=CutlineMath.locate(clips,playhead);if(hit)selected=clips[hit.index].id;paintTimeline();showAt(playhead,false);};
  btn('split').onclick=()=>{const index=clips.findIndex(c=>c.id===selected),hit=CutlineMath.locate(clips,playhead);if(index<0||!hit||hit.index!==index){say('Move the playhead inside the selected clip to split it.');return;}const next=CutlineMath.split(clips,index,hit.local,uid());if(!next){say('Move the playhead away from the clip edge to split.');return;}remember();clips=next;selected=clips[index+1].id;markChanged();say('Clip split at the playhead.');};
  btn('duplicate').onclick=()=>{const index=clips.findIndex(c=>c.id===selected);if(index<0)return;remember();const copy={...clips[index],id:uid()};clips.splice(index+1,0,copy);selected=copy.id;markChanged();};
  btn('remove').onclick=()=>{const index=clips.findIndex(c=>c.id===selected);if(index<0)return;remember();clips.splice(index,1);selected=clips[Math.min(index,clips.length-1)]?.id||null;playhead=Math.min(playhead,CutlineMath.duration(clips));playing=false;video.pause();markChanged();showAt(playhead,false);};
  function move(direction){const index=clips.findIndex(c=>c.id===selected),to=index+direction;if(index<0||to<0||to>=clips.length)return;remember();[clips[index],clips[to]]=[clips[to],clips[index]];playhead=clips.slice(0,to).reduce((n,c)=>n+c.out-c.in,0);playing=false;video.pause();markChanged();showAt(playhead,false);}
  btn('left').onclick=()=>move(-1);btn('right').onclick=()=>move(1);
  btn('undo').onclick=()=>{if(!history.length)return;future.push(snapshot());restore(history.pop());};btn('redo').onclick=()=>{if(!future.length)return;history.push(snapshot());restore(future.pop());};
  field('title').onchange=e=>{remember();title=e.target.value.slice(0,100);markChanged();};field('title').oninput=e=>{overlay.textContent=e.target.value;};
  field('filter').onchange=e=>{remember();filter=e.target.value;markChanged();};field('ratio').onchange=e=>{remember();ratio=e.target.value;markChanged();};field('volume').onchange=e=>{remember();volume=Math.max(0,Math.min(1,Number(e.target.value)));markChanged();};field('volume').oninput=e=>{video.volume=Number(e.target.value);};
  btn('new').onclick=()=>{if((media.length||clips.length)&&!window.confirm('Start a new project? The current saved project will be replaced.'))return;remember();playing=false;video.pause();seekVersion++;media.forEach(m=>URL.revokeObjectURL(m.url));media=[];clips=[];selected=null;playhead=0;sourceId=null;currentIndex=-1;title='';filter='none';volume=1;ratio='16:9';history=[];future=[];paint();showAt(0,false);save();};
  btn('fern').onclick=()=>{const seconds=Math.round(CutlineMath.duration(clips));openFern(`Give me concise editing ideas for a ${seconds}-second video with ${clips.length} clip${clips.length===1?'':'s'} in ${ratio} format. Suggest pacing, transitions, and a title.`);};
  async function addBlob(blob,name){
    if(!blob||!blob.size)throw new Error('Choose a non-empty video file.');
    if(blob.size>300*1024*1024)throw new Error('Each source must be 300 MB or smaller.');
    const url=URL.createObjectURL(blob),probe=document.createElement('video');probe.preload='metadata';
    try{const loaded=eventOnce(probe,'loadedmetadata');probe.src=url;probe.load();await loaded;if(!alive)throw new Error('Editor closed.');const duration=Number(probe.duration);if(!Number.isFinite(duration)||duration<=0||duration>600)throw new Error('Choose a video no longer than 10 minutes.');const item={id:uid(),name:String(name||'Video').slice(0,100),duration,blob,url};media.push(item);remember();clips.push({id:uid(),mediaId:item.id,in:0,out:duration});selected=clips.at(-1).id;playhead=CutlineMath.duration(clips)-duration;markChanged();showAt(playhead,false);return item;}catch(e){URL.revokeObjectURL(url);throw e;}finally{probe.removeAttribute('src');probe.load();}
  }
  input.onchange=async()=>{const files=[...(input.files||[])];input.value='';for(const file of files){if(!alive)break;try{if(!/^video\/(mp4|webm|quicktime)$/.test(file.type))throw new Error('Choose MP4, WebM, or QuickTime video.');say('Importing video…');await addBlob(file,file.name);}catch(e){say(e.message||'Could not import the video.');}}};
  btn('generate').onclick=()=>openGeneration(); btn('export').onclick=()=>exportVideo();
  function openGeneration(){
    if(generation)return;
    const layer=el('div','cut-modal-bg');layer.innerHTML=`<section class="cut-modal" role="dialog" aria-modal="true" aria-labelledby="gen-title"><h2 id="gen-title">Create a clip</h2><p>Generate a six-second clip with Google Veo 3.1 Fast through Pollinations. Your prompt is sent to Pollinations. Generation requires your own key, uses your credits, and can take several minutes. A canceled request may still be billed. Results and availability vary; generation is not unlimited. Square projects generate a landscape clip.</p><form class="cut-generate"><label>Describe your shot<textarea required maxlength="1000" placeholder="A slow aerial shot of a misty coastline at sunrise…"></textarea></label><label>Pollinations API key <input type="password" autocomplete="off" required placeholder="Used only for this request"></label><div class="cut-modal-status" role="status"></div><div class="cut-modal-actions"><button type="button" class="cut-btn" data-cancel>Cancel</button><button type="submit" class="cut-btn accent">Generate clip</button></div></form></section>`;
    root.appendChild(layer);const form=$('form',layer),prompt=$('textarea',layer),key=$('input',layer),msg=$('.cut-modal-status',layer),submit=$('button[type=submit]',layer);let controller=null;
    generation={close(){if(controller)controller.abort();key.value='';layer.remove();generation=null;}};
    $('[data-cancel]',layer).onclick=()=>generation&&generation.close();
    layer.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();generation&&generation.close();}};
    form.onsubmit=async e=>{
      e.preventDefault();const text=prompt.value.trim(), secret=key.value.trim();key.value='';if(!text||!secret){msg.textContent='Enter a prompt and API key.';return;}
      submit.disabled=true;msg.textContent='Generating… this can take several minutes.';controller=new AbortController();
      const timeout=setTimeout(()=>controller&&controller.abort(),600000);
      try{
        const url=new URL('https://gen.pollinations.ai/video/'+encodeURIComponent(text));url.searchParams.set('model','google/veo-3.1-fast');url.searchParams.set('duration','6');url.searchParams.set('aspectRatio',ratio==='9:16'?'9:16':'16:9');url.searchParams.set('audio','false');
        const response=await fetch(url.toString(),{headers:{Authorization:`Bearer ${secret}`},signal:controller.signal});
        if(!response.ok)throw new Error(`Pollinations returned ${response.status}. Check the key, credits, model access, and try again.`);
        const blob=await response.blob();if(!blob.size || (blob.type && !blob.type.startsWith('video/') && blob.type!=='application/octet-stream'))throw new Error('Pollinations did not return a video.');
        if(!alive || !generation)return;msg.textContent='Importing generated clip…';await addBlob(blob,'Generated clip.mp4');if(generation)generation.close();say('Generated clip added.');
      }catch(err){if(alive&&generation){msg.textContent=err.name==='AbortError'?'Generation canceled or timed out.':err.message||'Generation failed.';submit.disabled=false;}}
      finally{clearTimeout(timeout);controller=null;}
    };
    prompt.focus();
  }
  async function exportVideo(){
    if(exporting||!clips.length)return;
    if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream){say('WebM export is not supported in this browser.');return;}
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx&&!window.confirm('This browser cannot capture audio. Export a silent WebM video?'))return;
    const mime=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'].find(x=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(x));
    if(!mime){say('This browser cannot encode WebM video.');return;}
    const exportClips=clips.map(c=>({...c})),exportTitle=title,exportRatio=ratio,exportFilter=filter,exportVolume=volume;
    exporting=true;exportCancel=false;playing=false;video.pause();paintTimeline();
    const layer=el('div','cut-modal-bg');layer.innerHTML=`<section class="cut-modal" role="dialog" aria-modal="true"><h2>Exporting your story</h2><p>Rendering in real time. Keep this tab visible; longer timelines take longer, and performance depends on your device. The result is a WebM file.</p><div class="cut-modal-status" role="status">Preparing…</div><div class="cut-modal-actions"><button class="cut-btn" data-cancel>Cancel export</button></div></section>`;root.appendChild(layer);
    $('[data-cancel]',layer).onclick=()=>{exportCancel=true;if(cancelExportWait)cancelExportWait();};
    const message=$('.cut-modal-status',layer), canvas=document.createElement('canvas');
    [canvas.width,canvas.height]=exportRatio==='9:16'?[720,1280]:exportRatio==='1:1'?[720,720]:[1280,720];
    const ctx=canvas.getContext('2d'), v=document.createElement('video');v.playsInline=true;v.preload='auto';v.style.cssText='position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';root.appendChild(v);
    let audio=null,mediaSource=null,recorder=null,stream=null,hiddenCancel=false;const chunks=[];
    const onVisibility=()=>{if(document.hidden){hiddenCancel=true;exportCancel=true;v.pause();if(cancelExportWait)cancelExportWait();}};document.addEventListener('visibilitychange',onVisibility);
    function draw(){
      ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);const sw=v.videoWidth,sh=v.videoHeight;if(sw&&sh){const scale=Math.min(canvas.width/sw,canvas.height/sh),w=sw*scale,h=sh*scale;ctx.filter=FILTERS[exportFilter]||'none';ctx.drawImage(v,(canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.filter='none';}
      if(exportTitle){const size=Math.round(canvas.width*.045);ctx.font=`700 ${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(exportTitle,canvas.width/2,canvas.height*.9,canvas.width*.84);ctx.shadowBlur=0;}
    }
    function waitPlaying(end){return new Promise((resolve,reject)=>{let raf=0;function finish(error){cancelAnimationFrame(raf);cancelExportWait=null;error?reject(error):resolve();}cancelExportWait=()=>finish(new Error('Export canceled.'));function frame(){if(exportCancel||!alive)return finish(new Error('Export canceled.'));draw();if(v.currentTime>=end-.035||v.ended){v.pause();return finish();}raf=requestAnimationFrame(frame);}raf=requestAnimationFrame(frame);});}
    try{
      if(!ctx)throw new Error('Canvas rendering is unavailable.');
      stream=canvas.captureStream(30);
      if(AudioCtx){audio=new AudioCtx();mediaSource=audio.createMediaElementSource(v);const gain=audio.createGain(),dest=audio.createMediaStreamDestination();gain.gain.value=exportVolume;mediaSource.connect(gain);gain.connect(dest);for(const t of dest.stream.getAudioTracks())stream.addTrack(t);await audio.resume();}
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
      const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Video encoder failed.'));});finished.catch(()=>{});
      for(let i=0;i<exportClips.length;i++){
        if(exportCancel||!alive)throw new Error('Export canceled.');const clip=exportClips[i],item=source(clip.mediaId);if(!item)throw new Error('A source clip is missing.');message.textContent=`Rendering clip ${i+1} of ${exportClips.length}…`;
        // Do not record blank frames or silent gaps while a source loads/seeks.
        if(recorder.state==='recording')recorder.pause();
        const loaded=eventOnce(v,'loadedmetadata');v.src=item.url;v.load();await loaded;if(clip.in>.01){const seeked=eventOnce(v,'seeked');v.currentTime=clip.in;await seeked;}draw();await v.play();
        if(recorder.state==='inactive')recorder.start(250);else if(recorder.state==='paused')recorder.resume();
        await waitPlaying(clip.out);
      }
      recorder.stop();await finished;recorder=null;
      if(exportCancel||!alive)throw new Error('Export canceled.');
      const blob=new Blob(chunks,{type:'video/webm'});if(!blob.size)throw new Error('The browser returned an empty recording.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cutline-video.webm';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);say('Export complete · cutline-video.webm');
    }catch(e){if(alive)say(hiddenCancel?'Export canceled because the tab was hidden.':(e.message||'Export failed.'));}
    finally{document.removeEventListener('visibilitychange',onVisibility);cancelExportWait=null;if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}v.pause();v.removeAttribute('src');v.load();v.remove();if(stream)stream.getTracks().forEach(t=>t.stop());if(mediaSource)try{mediaSource.disconnect();}catch{}if(audio)try{await audio.close();}catch{}layer.remove();exporting=false;if(alive)paintTimeline();}
  }
  (async()=>{
    say('Loading your project…');
    const data=await CutlineStorage.get(userId);if(!alive)return;
    if(!data||!Array.isArray(data.media)){ready=true;paint();say('Import a clip to begin.');return;}
    try{
      media=data.media.filter(m=>m.blob&&m.id&&Number.isFinite(m.duration)).map(m=>({...m,url:URL.createObjectURL(m.blob)}));
      clips=(Array.isArray(data.clips)?data.clips:[]).filter(c=>source(c.mediaId)&&Number.isFinite(c.in)&&Number.isFinite(c.out)&&c.in>=0&&c.out>c.in&&c.out<=source(c.mediaId).duration).map(c=>({...c}));
      selected=clips.some(c=>c.id===data.selected)?data.selected:(clips[0]?.id||null);title=String(data.title||'').slice(0,100);filter=FILTERS[data.filter]?data.filter:'none';volume=Number.isFinite(data.volume)?Math.max(0,Math.min(1,data.volume)):1;ratio=['16:9','9:16','1:1'].includes(data.ratio)?data.ratio:'16:9';playhead=Math.max(0,Math.min(Number(data.playhead)||0,CutlineMath.duration(clips)));ready=true;paint();if(clips.length)showAt(playhead,false);say('Restored your locally saved project.');
    }catch{ready=true;paint();say('Could not restore the saved project.');}
  })();
  paint();
  return {update(){},destroy(){alive=false;playing=false;exportCancel=true;if(cancelExportWait)cancelExportWait();seekVersion++;if(generation)generation.close();video.pause();video.removeAttribute('src');video.load();media.forEach(m=>URL.revokeObjectURL(m.url));}};
}
