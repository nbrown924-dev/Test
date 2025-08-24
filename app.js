
// v2.1 — no ES modules, robust fetch, on-page error banner

(function(){
  const EB = document.getElementById('error-banner');
  function showError(msg){
    EB.style.display = 'block';
    EB.textContent = '⚠️ ' + msg;
    console.error('Configurator error:', msg);
  }
  window.addEventListener('error', (e)=> showError(e.message || 'Unknown script error'));

  const UI = {
    familySel: document.getElementById('family'),
    modelSel:  document.getElementById('model'),
    optionsEl: document.getElementById('options'),
    specsTable:document.getElementById('specs-table'),
    modelImg:  document.getElementById('model-image'),
    sumModel:  document.getElementById('sum-model'),
    sumOpts:   document.getElementById('sum-options'),
    sumWeight: document.getElementById('sum-weight'),
    sumTotal:  document.getElementById('sum-total'),
    sumLead:   document.getElementById('sum-lead'),
    btnDownload: document.getElementById('btn-download-quote'),
    btnShare:    document.getElementById('btn-share'),
    btnSnapshot: document.getElementById('btn-snapshot'),
    btnReqQuote: document.getElementById('btn-request-quote'),
    btnLoadDemo: document.getElementById('btn-load-demo'),
  };

  let CATALOG = null;
  let selected = new Set();
  let currentModel = null;

  // ---- Three.js scene (same as before) ----
  const container = document.getElementById('stage-canvas');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 2000);
  camera.position.set(4.5, 3.7, 6.5);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(5,10,7); scene.add(dir);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({color:0x0a0f14, metalness:0, roughness:1}));
  ground.rotation.x = -Math.PI/2; scene.add(ground);

  const logical = {frame:null,tank:null,reel:null,pump:null,foam:null};
  function makeFrame(L=1.5, W=1.0) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color:0x95a5a6, metalness:0.6, roughness:0.4});
    const beam = (x,y,z,lx,ly,lz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(lx,ly,lz),mat); m.position.set(x,y,z); g.add(m);};
    const h=0.07; beam(0,h/2,W/2, L,h,0.06); beam(0,h/2,-W/2, L,h,0.06); beam(L/2,h/2,0,0.06,h,W); beam(-L/2,h/2,0,0.06,h,W); beam(0,h/2,0,L,h,0.06);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L,0.03,W), new THREE.MeshStandardMaterial({color:0x3d4b59, metalness:0.2, roughness:0.9}));
    deck.position.y = 0.1; g.add(deck); g.position.y=0.01; return g;
  }
  function makeTank(len,width,height,color=0x2ecc71) {
    const g=new THREE.Group(); const tank=new THREE.Mesh(new THREE.BoxGeometry(len,height,width), new THREE.MeshStandardMaterial({color,metalness:0.2,roughness:0.7}));
    tank.position.y=0.1+height/2; g.add(tank);
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,height-0.1,12), new THREE.MeshStandardMaterial({color:0x3498db,transparent:true,opacity:0.8}));
    tube.rotation.z=Math.PI/2; tube.position.set(-len/2+0.05, 0.1+height/2, 0); g.add(tube); return g;
  }
  function makeReel(r=0.16,e=false){const g=new THREE.Group(); const drum=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.28,24), new THREE.MeshStandardMaterial({color:0xf1c40f})); drum.rotation.z=Math.PI/2; g.add(drum);
    if(e){const motor=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.16),new THREE.MeshStandardMaterial({color:0x888888})); motor.position.set(0.2,0.06,0); g.add(motor);} g.position.set(0.45,0.35,0); return g;}
  function makePump(type="mini"){const color={mini:0x9b59b6, dual:0x8e44ad, dualES:0x7d3c98, hp20:0x6c3483}[type]||0x9b59b6; const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.22,0.24), new THREE.MeshStandardMaterial({color})); body.position.set(0.0,0.23,-0.22); g.add(body);
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,16), new THREE.MeshStandardMaterial({color:0xd0d0d0,metalness:0.8,roughness:0.3}));
    pipe.rotation.z=Math.PI/2; pipe.position.set(-0.1,0.28,-0.22); g.add(pipe); return g; }
  function makeFoam(){const g=new THREE.Group(); const t=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.25,20), new THREE.MeshStandardMaterial({color:0x3498db})); t.position.set(-0.45,0.25,0.1); g.add(t); return g;}

  function layoutForModel(model){const Lm=(model.dims?.L||72)/39.37; const Wm=(model.dims?.W||48)/39.37; return {L:Lm,W:Wm}; }
  function buildBase(model){for(const k of Object.keys(logical)){ if(logical[k]){scene.remove(logical[k]); logical[k]=null;}} const {L,W}=layoutForModel(model); const frame=makeFrame(L,W); scene.add(frame); logical.frame=frame; updateMeshes();}
  function updateMeshes(){
    if(!currentModel) return; const {L,W}=layoutForModel(currentModel);
    if(logical.tank) scene.remove(logical.tank);
    if(selected.has('tank-50')) logical.tank=makeTank(L*0.6,W*0.7,0.35);
    else if(selected.has('tank-70')) logical.tank=makeTank(L*0.7,W*0.75,0.38);
    else if(selected.has('tank-100')) logical.tank=makeTank(L*0.9,W*0.8,0.45);
    else if(selected.has('tank-300')) logical.tank=makeTank(L*0.9,W*0.9,0.55);
    else if(selected.has('tank-400')) logical.tank=makeTank(L*0.95,W*0.95,0.62);
    else if(selected.has('tank-500')) logical.tank=makeTank(L*1.0,W*0.95,0.7);
    if(logical.tank) scene.add(logical.tank);
    if(logical.reel) scene.remove(logical.reel);
    if(selected.has('reel-manual')) logical.reel=makeReel(0.16,false);
    else if(selected.has('reel-electric')) logical.reel=makeReel(0.18,true);
    if(logical.reel){ logical.reel.position.set(L*0.2,0,0); scene.add(logical.reel);}
    if(logical.pump) scene.remove(logical.pump);
    if(selected.has('pump-mini')) logical.pump=makePump('mini');
    else if(selected.has('pump-dual')) logical.pump=makePump('dual');
    else if(selected.has('pump-dual-es')) logical.pump=makePump('dualES');
    else if(selected.has('pump-20hp')) logical.pump=makePump('hp20');
    if(logical.pump){ logical.pump.position.set(L*0.15,0,-W*0.25); scene.add(logical.pump);}
    if(logical.foam) scene.remove(logical.foam);
    if(selected.has('foam-4171')){ logical.foam=makeFoam(); logical.foam.position.set(0,0,0); scene.add(logical.foam);}
  }

  function computeTotals(){
    const optById=Object.fromEntries(CATALOG.options.map(o=>[o.id,o]));
    const addonsById=Object.fromEntries((CATALOG.addons||[]).map(a=>[a.id,a]));
    let total=currentModel.basePrice, weight=currentModel.baseWeight; let items=new Set(selected);
    enforceRules(items);
    for(const id of items){const item=optById[id]||addonsById[id]; if(!item) continue; total+=(item.price||0); weight+=(item.weight||0);}
    return {total,weight,items:[...items]};
  }
  function enforceRules(items){
    if(items.has('reel-electric')) items.delete('reel-manual');
    if(items.has('reel-manual')) items.delete('reel-electric');
    for(const rule of CATALOG.rules){ const famOK = !rule.if.family || (currentModel.family===rule.if.family); let condOK=famOK;
      if(rule.if.tankMin){ const tMin=rule.if.tankMin; const has100=items.has('tank-100')||items.has('tank-300')||items.has('tank-400')||items.has('tank-500'); if(tMin>=100 && !has100) condOK=false; if(tMin>=400 && !(items.has('tank-400')||items.has('tank-500'))) condOK=false; }
      if(rule.if.option){ if(!items.has(rule.if.option)) condOK=false; }
      if(condOK){ (rule.then.require||[]).forEach(id=>items.add(id)); (rule.then.add||[]).forEach(id=>items.add(id)); }
    }
  }

  function renderOptions(){
    const fam=currentModel.family; const groups=[...new Set(CATALOG.options.map(o=>o.group))]; UI.optionsEl.innerHTML="";
    groups.forEach(group=>{ const wrap=document.createElement('div'); wrap.className="opt-group"; const title=document.createElement('h3'); title.textContent=group; title.style.margin="8px 0 4px"; wrap.appendChild(title);
      CATALOG.options.filter(o=>o.group===group && (!o.families || o.families.includes(fam))).forEach(o=>{ const row=document.createElement('div'); row.className="opt-item"; const id="chk-"+o.id;
        row.innerHTML=`<label><input type="checkbox" id="${id}" data-oid="${o.id}"> ${o.label}</label><span class="price">+$${o.price}</span>`;
        wrap.appendChild(row);
        setTimeout(()=>{ const el=document.getElementById(id); el.checked=selected.has(o.id); el.addEventListener('change',(e)=>{ if(e.target.checked) selected.add(o.id); else selected.delete(o.id);
          const totals=computeTotals(); updateSummary(totals); updateMeshes(); updateDownload(totals); updateURL(); }); },0);
      });
      UI.optionsEl.appendChild(wrap);
    });
  }

  function renderSpecsTable(){
    UI.specsTable.innerHTML="";
    const specs=currentModel.specs||{};
    Object.keys(specs).forEach(k=>{ const tr=document.createElement('tr'); const td1=document.createElement('td'); const td2=document.createElement('td'); td1.textContent=k; td2.textContent=specs[k]; tr.appendChild(td1); tr.appendChild(td2); UI.specsTable.appendChild(tr); });
  }

  function updateSummary({total,weight}){
    UI.sumModel.textContent=currentModel.name;
    const labels = CATALOG.options.filter(o=>selected.has(o.id)).map(o=>o.label);
    UI.sumOpts.textContent=labels.join(', ')||'None';
    UI.sumWeight.textContent=Math.round(weight);
    UI.sumTotal.textContent=`$${total.toLocaleString()}`;
    UI.sumLead.textContent=`${currentModel.leadWeeks} weeks`;
  }
  function updateDownload(totals){
    const payload={ model:currentModel, selected:[...selected], totals, timestamp:new Date().toISOString() };
    const blob=new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url=URL.createObjectURL(blob); UI.btnDownload.href=url;
  }
  function updateURL(){
    const payload={ m: currentModel.id, s:[...selected] };
    const str=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); location.hash=str;
  }
  function restoreFromURL(){
    if(!location.hash) return false; try{ const str=location.hash.slice(1); const json=JSON.parse(decodeURIComponent(escape(atob(str)))); const found=CATALOG.models.find(m=>m.id===json.m);
      if(!found) return false; currentModel=found; selected=new Set(json.s||[]); return true; }catch(e){ return false; }
  }

  // Snapshot & Share
  UI.btnSnapshot.addEventListener('click', ()=>{ renderer.render(scene,camera); const link=document.createElement('a'); link.href=renderer.domElement.toDataURL('image/png'); link.download='skid-snapshot.png'; link.click(); });
  UI.btnShare.addEventListener('click', ()=>{ updateURL(); navigator.clipboard.writeText(location.href).then(()=>{ UI.btnShare.textContent="Link copied!"; setTimeout(()=>UI.btnShare.textContent="Share build",1400); }).catch(()=>{}); });
  UI.btnReqQuote.addEventListener('click', ()=>{ const {total,weight,items}=computeTotals(); const body=encodeURIComponent(`I'd like a quote on this configuration:%0D%0A%0D%0AModel: ${currentModel.name}%0DOptions: ${items.join(', ')}%0DTotal: $${total}%0DWeight: ${weight} lb%0DLink: ${location.href}`); window.location.href=`mailto:sales@warriorbrushtrucks.com?subject=Skid%20Quote%20Request&body=${body}`); });

  // Test Build: auto-fill a sample configuration to verify UI & pricing
  UI.btnLoadDemo.addEventListener('click', ()=>{
    try{
      // Choose a representative model (Truck Skid with more options visible)
      const modelId = 'truck-100-500-poly';
      const m = CATALOG.models.find(mm => mm.id === modelId) || CATALOG.models[0];
      // Switch family & model selectors
      UI.familySel.value = m.family;
      // Trigger model load
      const loadModelsEvt = new Event('change');
      UI.familySel.dispatchEvent(loadModelsEvt);
      // Wait a tick for models to populate
      setTimeout(()=>{
        UI.modelSel.value = m.id;
        UI.modelSel.dispatchEvent(new Event('change'));
        // After model loads, select a set of options
        setTimeout(()=>{
          const want = new Set(['tank-400','reel-electric','hose-1x100','pump-dual-es','foam-4171','manifold-ss','fittings-ss']);
          selected = new Set([...selected, ...want]);
          renderOptions(); // re-render checkboxes
          // Re-check those boxes in the DOM
          want.forEach(id=>{
            const el = document.getElementById('chk-'+id);
            if(el){ el.checked = true; }
          });
          const totals = computeTotals();
          updateSummary(totals);
          updateMeshes();
          updateDownload(totals);
          updateURL();
          // Visual nudge: flash the error banner area as a success toast
          EB.style.display='block';
          EB.style.background='#0d5b2a';
          EB.style.border='1px solid #129c4a';
          EB.textContent='✅ Test build loaded: Truck Skid (400 gal) with common options.';
          setTimeout(()=>{ EB.style.display='none'; }, 2500);
        }, 80);
      }, 50);
    }catch(e){
      showError('Could not load test build: ' + (e?.message||e));
    }
  });

  // Load data + init UI
  function initUI(){
    // Families
    UI.familySel.innerHTML = "";
    CATALOG.families.forEach(f=> UI.familySel.add(new Option(f,f)));
    UI.familySel.addEventListener('change', ()=> loadModels(UI.familySel.value));

    // Models
    UI.modelSel.addEventListener('change', ()=>{
      const id = UI.modelSel.value;
      const m  = CATALOG.models.find(mm=>mm.id===id);
      currentModel = m;
      selected = new Set(m.defaults||[]);
      renderOptions(); buildBase(m);
      const totals = computeTotals(); updateSummary(totals); updateDownload(totals); updateURL(); renderSpecsTable();
      UI.modelImg.src = m.imageUrl || ""; UI.modelImg.style.display = m.imageUrl ? 'block' : 'none';
    });

    function loadModels(fam){
      UI.modelSel.innerHTML = "";
      CATALOG.models.filter(m=>m.family===fam).forEach(m => UI.modelSel.add(new Option(m.name, m.id)));
      // trigger change AFTER options are populated
      UI.modelSel.dispatchEvent(new Event('change'));
    }

    // First-time selection
    if(!restoreFromURL()){
      UI.familySel.value = CATALOG.families[0];
      loadModels(UI.familySel.value);
    } else {
      UI.familySel.value = currentModel.family;
      loadModels(currentModel.family);
      UI.modelSel.value = currentModel.id;
      selected = new Set([...selected]);
      renderOptions(); buildBase(currentModel);
      const totals=computeTotals(); updateSummary(totals); updateDownload(totals); renderSpecsTable();
      UI.modelImg.src=currentModel.imageUrl||""; UI.modelImg.style.display = currentModel.imageUrl ? 'block' : 'none';
    }

    // Resize
    window.addEventListener('resize', ()=>{
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth/container.clientHeight;
      camera.updateProjectionMatrix();
    });

    (function tick(){ controls.update(); renderer.render(scene,camera); requestAnimationFrame(tick); })();
  }

  // Fetch catalog.json (works from file:// in most modern browsers, but if blocked, we show a clear error)
  fetch('./catalog.json')
    .then(r => {
      if(!r.ok) throw new Error('Could not load catalog.json');
      return r.json();
    })
    .then(data => { CATALOG = data; initUI(); })
    .catch(err => {
      showError('Could not load catalog.json. If you opened this file directly, try running a local server.');
      console.error(err);
    });
})();
