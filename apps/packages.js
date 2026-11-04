/* Bundled package management and local-only Windows PE header inspection.
   Inspection is not execution, malware scanning, or signature verification. */
const PACKAGE_CATALOG = [
  {id:'cutline', description:'A local-first video editor with a timeline, titles, color and WebM export.', version:'1.0', category:'Creative'},
  {id:'focus', description:'Start a focus session or break using shared CanopyOS timers.', version:'1.0', category:'Productivity'},
  {id:'colorlab', description:'Explore a harmonious palette and copy colors for your next project.', version:'1.0', category:'Creative'},
];

function setAppInstalled(id, installed) {
  if (!OS.user || !PACKAGE_CATALOG.some(app => app.id === id)) return false;
  const current = Array.isArray(OS.settings.installedApps) ? OS.settings.installedApps : [];
  const next = installed ? [...new Set([...current, id])] : current.filter(app => app !== id);
  if (!installed) OS.windows.filter(w => w.app === id && !w.closing).forEach(w => closeWindow(w.id));
  Users.update(OS.user.id, {settings:{installedApps:next}});
  updateSettings({installedApps:next});
  bus.emit('apps');
  return true;
}

async function inspectWindowsExecutable(file) {
  if (!file || !/\.exe$/i.test(file.name || '')) throw new Error('Choose a file with the .exe extension.');
  if (!Number.isSafeInteger(file.size) || file.size < 64) throw new Error('The file is too small to contain a Windows executable header.');
  async function read(offset, length) {
    if (offset < 0 || length < 0 || offset > file.size || length > file.size-offset) throw new Error('The executable header is truncated or invalid.');
    const part = file.slice(offset, offset + length);
    const bytes = part.arrayBuffer ? await part.arrayBuffer() : await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsArrayBuffer(part);});
    if (bytes.byteLength !== length) throw new Error('Could not read the complete executable header.');
    return new DataView(bytes);
  }
  const dos = await read(0, 64);
  if (dos.getUint16(0, true) !== 0x5a4d) throw new Error('This file does not have an MZ executable header.');
  const offset = dos.getUint32(0x3c, true);
  if (offset < 64 || offset > file.size - 24) throw new Error('The PE header offset is invalid or truncated.');
  const header = await read(offset, 24);
  if (header.getUint32(0, true) !== 0x00004550) throw new Error('This is not a supported Windows PE file. Legacy DOS executables are not supported.');
  const machine = header.getUint16(4,true), sections = header.getUint16(6,true), optionalSize = header.getUint16(20,true), flags = header.getUint16(22,true);
  if (optionalSize < 70 || optionalSize > 4096 || offset + 24 + optionalSize + sections * 40 > file.size) throw new Error('The PE optional header or section table is truncated or invalid.');
  const optional = await read(offset + 24, optionalSize), magic = optional.getUint16(0,true);
  if (magic !== 0x10b && magic !== 0x20b) throw new Error('This PE format is not supported; expected PE32 or PE32+.');
  const names = {0x14c:'x86 (32-bit)',0x8664:'x64',0x1c0:'ARM',0x1c4:'ARM Thumb-2',0xaa64:'ARM64',0x200:'Itanium'};
  const subsystems = {1:'Native',2:'Windows GUI',3:'Windows console',7:'POSIX console',9:'Windows CE GUI',10:'EFI application',11:'EFI boot service',12:'EFI runtime driver',14:'Xbox'};
  const subsystem = optional.getUint16(68,true), dirCountOffset = magic === 0x10b ? 92 : 108, certOffset = magic === 0x10b ? 128 : 144;
  let certificate = 'No certificate directory recorded';
  if (optionalSize >= dirCountOffset + 4 && optional.getUint32(dirCountOffset,true) > 4) {
    if (optionalSize < certOffset + 8) throw new Error('The PE certificate directory is truncated.');
    const start = optional.getUint32(certOffset,true), length = optional.getUint32(certOffset+4,true);
    if ((start === 0) !== (length === 0) || (start && (start > file.size || length > file.size-start))) throw new Error('The PE certificate directory points outside the file.');
    if (start) certificate = 'Certificate data present (not verified)';
  }
  return {
    name: String(file.name), size:file.size, format: magic === 0x10b ? 'PE32' : 'PE32+',
    architecture:names[machine] || `Unknown (0x${machine.toString(16).padStart(4,'0')})`,
    subsystem:subsystems[subsystem] || `Other (0x${subsystem.toString(16).padStart(4,'0')})`,
    sections, entryPoint:'0x' + optional.getUint32(16,true).toString(16).padStart(8,'0'),
    imageType:(flags & 0x2000) ? 'DLL image' : (flags & 0x0002) ? 'Executable image' : 'Other PE image', certificate,
  };
}

function PackageManager({win, body}) {
  let section = 'all', query = win.props && PACKAGE_CATALOG.some(a=>a.id===win.props.app) ? APPS[win.props.app].name.toLowerCase() : '', alive = true, inspection = null, request = 0;
  body.innerHTML = `<div class="package-manager"><aside class="pkg-side" data-drag="1"><div class="pkg-brand"><span class="pkg-logo">◈</span><span>PACKAGES<small>CANOPY SYSTEM</small></span></div><div class="pkg-nav"></div><div class="pkg-side-note">Packages are bundled with CanopyOS and managed per profile.</div></aside><main class="pkg-main thin-scroll"><div class="pkg-top"><div><div class="pkg-eyebrow">SYSTEM TOOLS</div><h1>Package Manager</h1><p>Manage bundled apps and inspect Windows executable files.</p></div></div><div class="pkg-content"></div></main></div>`;
  const root=$('.package-manager',body),nav=$('.pkg-nav',root),content=$('.pkg-content',root);
  function paintNav(){
    nav.innerHTML='';
    for (const [id,label,glyph] of [['all','All packages','▦'],['installed','Installed','✓'],['inspect','Inspect .exe','⌕']]) {
      const button=el('button','pkg-nav-item'+(section===id?' on':''));
      button.innerHTML=`<span aria-hidden="true">${glyph}</span><span>${label}</span>`;
      button.onclick=()=>{section=id;paint();};nav.appendChild(button);
    }
  }
  async function inspect(file){
    const ticket=++request;inspection={loading:true};paint();
    try {const result=await inspectWindowsExecutable(file);if(!alive||ticket!==request)return;inspection={result};}
    catch(e){if(!alive||ticket!==request)return;inspection={error:e.message||'Could not read the file.'};}
    paint();
  }
  function paint(){
    if(!alive)return;paintNav();content.innerHTML='';
    if(section==='inspect'){
      const panel=el('div','pkg-inspector');panel.innerHTML=`<div class="pkg-intro"><div><h2>Windows executable inspector</h2><p>Read PE header information from a local .exe file.</p></div><span class="pkg-tag">LOCAL ONLY</span></div><div class="pkg-drop"><span class="pkg-drop-icon" aria-hidden="true">⇧</span><button type="button" class="pkg-button primary pkg-choose">Choose an .exe file</button><span>or drop a file here</span><input type="file" accept=".exe,application/vnd.microsoft.portable-executable,application/x-msdownload" aria-label="Choose a Windows executable" hidden></div><p class="pkg-disclaimer"><strong>Inspection only.</strong> CanopyOS cannot install or run Windows programs in the browser. This is not a malware scan or signature verification. Only header bytes are read on your device; the file is not uploaded or saved.</p><div class="pkg-runner"><strong>Try running an older Windows app</strong><p>Open the independent ExeBrowser service to try a 32-bit Windows executable in an experimental browser emulator. Compatibility is limited; Many modern and 64-bit programs will not run. Your file is not transferred by CanopyOS; review the third party’s privacy terms before selecting a file there.</p><a class="pkg-button" href="https://exebrowser.com/load-exe/" target="_blank" rel="noopener noreferrer">Open experimental runner ↗</a></div><div class="pkg-result" role="status" aria-live="polite"></div>`;
      content.appendChild(panel);const drop=$('.pkg-drop',panel),input=$('input',drop),result=$('.pkg-result',panel);
      $('.pkg-choose',drop).onclick=()=>input.click();
      input.onchange=()=>{const file=input.files&&input.files[0];input.value='';if(file)inspect(file);};
      drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');const file=e.dataTransfer&&e.dataTransfer.files[0];if(file)inspect(file);};
      if(inspection?.loading)result.textContent='Reading executable headers…';
      else if(inspection?.error){const error=el('div','pkg-error');error.textContent=inspection.error;result.appendChild(error);}
      else if(inspection?.result){
        const r=inspection.result, title=el('h3','pkg-file-name');title.textContent=r.name;result.appendChild(title);
        const grid=el('div','pkg-details');
        for(const [label,value] of [['Format',r.format],['Header machine',r.architecture],['Image type',r.imageType],['Subsystem',r.subsystem],['Sections',String(r.sections)],['Entry point',r.entryPoint],['File size',`${r.size.toLocaleString()} bytes`],['Certificate',r.certificate]]){
          const cell=el('div','pkg-detail');const key=el('span','',label),val=el('strong');val.textContent=value;cell.append(key,val);grid.appendChild(cell);
        }
        result.appendChild(grid);
      }
      return;
    }
    const toolbar=el('div','pkg-toolbar');toolbar.innerHTML=`<div><h2>${section==='installed'?'Installed packages':'Bundled packages'}</h2><p>Install, open, or remove an app for this profile.</p></div><input type="search" placeholder="Filter packages" aria-label="Filter packages">`;content.appendChild(toolbar);
    const search=$('input',toolbar);search.value=query;search.oninput=()=>{query=search.value.trim().toLowerCase();paintList();};
    const list=el('div','pkg-list');content.appendChild(list);
    function paintList(){
      list.innerHTML='';const apps=PACKAGE_CATALOG.filter(a=>(section!=='installed'||isAppInstalled(a.id)) && (APPS[a.id].name+' '+a.description+' '+a.category).toLowerCase().includes(query));
      if(!apps.length){list.appendChild(el('div','pkg-empty','No packages match this view.'));return;}
      for(const app of apps){
        const installed=isAppInstalled(app.id),row=el('article','pkg-row');row.dataset.package=app.id;
        row.innerHTML=`<div class="pkg-icon">${appIconSVG(app.id)}</div><div class="pkg-info"><div class="pkg-name"><strong>${esc(APPS[app.id].name)}</strong><span>${installed?'Installed':'Available'}</span></div><p>${esc(app.description)}</p><small>${esc(app.category)} · v${esc(app.version)} · Bundled</small></div><div class="pkg-actions"><button class="pkg-button primary" data-action>${installed?'Open':'Install'}</button>${installed?'<button class="pkg-button" data-remove>Remove</button>':''}</div>`;
        $('[data-action]',row).onclick=()=>{if(installed)openApp(app.id);else setAppInstalled(app.id,true);};
        const remove=$('[data-remove]',row);if(remove)remove.onclick=()=>{if(window.confirm(`Remove ${APPS[app.id].name} from this profile? Its saved data is kept.`))setAppInstalled(app.id,false);};list.appendChild(row);
      }
    }
    paintList();
    const footer=el('p','pkg-footer','These packages are already part of CanopyOS; installation does not download software.');content.appendChild(footer);
  }
  const off=bus.on('apps',paint);paint();
  return {update(props){if(props&&PACKAGE_CATALOG.some(a=>a.id===props.app)){section='all';query=APPS[props.app].name.toLowerCase();paint();}},destroy(){alive=false;request++;off();}};
}
