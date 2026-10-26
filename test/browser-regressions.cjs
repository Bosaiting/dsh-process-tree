// DSH_PLAYWRIGHT_MODULE and DSH_CHROMIUM_EXECUTABLE may select a local runtime.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.DSH_PLAYWRIGHT_MODULE || 'playwright');
const source = fs.readFileSync(process.env.DSH_CLIENT_SOURCE || path.join(__dirname, '..', 'client.js'), 'utf8');
const reactRoot = process.env.DSH_REACT_ROOT || path.dirname(path.dirname(require.resolve('react/package.json')));
const out = process.env.DSH_TEST_OUTPUT || path.join(__dirname, 'browser-results');
fs.mkdirSync(out, { recursive: true });
let tested = source.replace('DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX,', `DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX, CSS, TreeView, createManager,
  change: (patch) => {SETTINGS=normalize({...SETTINGS,...patch});queueLineVars();for(const view of watchedViews.values())view.syncSettings()},
  resources:()=>({views:watchedViews.size,rows:rowOwners.size,clips:clipOwners.size,crowns:floatingCrowns.size,libraries:crownLibraries.size,settingsFrame,frameHandle,crownPositionFrame}),`);
for (const fn of ['geometryOf', 'strokeGeometry', 'branchBody', 'positionCrowns', 'syncCrownLibraries']) {
  tested = tested.replace(new RegExp('(function ' + fn + '\\([^)]*\\) \\{)'), '$1 window.count("' + fn + '");');
}
const html = '<!doctype html><html><head><style>html,body{margin:0;font:14px/24px Arial}body{padding:20px}[data-chat-flow]{width:760px}[data-step-process]{margin-bottom:40px}[data-step-process-content]{display:flex;flex-direction:column;gap:12px}[data-disclosure-row]{display:flex;align-items:center;height:24px}[data-subcalls]{display:flex;flex-direction:column;gap:16px}.output{line-height:20px}#unrelated{position:fixed;right:0;top:0}</style></head><body><div id="flow" data-chat-flow></div><div id="unrelated"></div></body></html>';
const setup = () => {
  window.stats = {}; window.instances = new Set(); window.rectReads = 0;
  window.count = (key) => { stats[key] = (stats[key] || 0) + 1 };
  window.reset = () => { stats = {}; rectReads = 0 };
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (...args) { rectReads++; return rect.apply(this, args) };
  window.__ModuleLoader__ = { load(spec) {window.moduleSpec = spec} };
  window[Symbol.for('dsh.process-tree.test')] = (api) => {window.api=api};
  window.frames = async (n = 6) => {for(let i=0;i<n;i++)await new Promise(requestAnimationFrame)};
  window.makeGroup = (key, total, nested = false) => {
    const group = document.createElement('section'); group.dataset.stepProcess='';group.dataset.chatGroupKey=key;
    group.innerHTML='<button data-process-activity>过程</button><div data-step-process-body><div data-step-process-content></div></div>';
    const content=group.querySelector('[data-step-process-content]');
    let sub=null;
    for(let i=0;i<total;i++){
      const row=document.createElement('div');row.dataset.chatFlowKind='tool-call';row.dataset.chatAnchorKey=key+'-'+i;
      row.innerHTML='<div data-chat-call-id="'+key+'-'+i+'"><div data-state="completed"><div data-disclosure-row><span>工具 '+i+'</span></div></div><div class="output"></div></div>';
      if(nested && i>0)sub.append(row.firstChild);else content.append(row);
      if(nested && i===0){sub=document.createElement('div');sub.dataset.subcalls='';row.firstChild.append(sub)}
    }
    document.querySelector('#flow').append(group);return group;
  };
  window.checkAlignment = () => {
    const errors=[];let checked=0;
    for(const view of instances){
      if(view.stopped||view.suspended||!view.model)continue;
      let clipTop=0,clipBottom=innerHeight;
      for(const parent of view.clipParents||[]){const r=parent.getBoundingClientRect();clipTop=Math.max(clipTop,r.top);clipBottom=Math.min(clipBottom,r.bottom)}
      for(const entry of view.structure){
        if(!entry.call||!entry.header||entry.header.closest('[hidden]'))continue;
        const h=entry.header.getBoundingClientRect();
        if(h.height>0&&h.width>0&&h.bottom>clipTop&&h.top<clipBottom&&h.right>0&&h.left<innerWidth&&!view.dotEls.has('dot:'+entry.key))errors.push('unpainted visible '+entry.key);
      }
      for(const node of view.model.nodes){
        const header=node.call?.querySelector('[data-disclosure-row]');if(!header)continue;
        const h=header.getBoundingClientRect();
        if(h.bottom<0||h.top>innerHeight||h.height===0||header.closest('[hidden]'))continue;
        const dot=view.dotEls.get('dot:'+node.key);
        if(!dot){errors.push('missing '+node.key);continue}
        const d=dot.getBoundingClientRect(),dy=d.top+d.height/2-h.top-h.height/2;
        if(Math.abs(dy)>.8)errors.push(node.key+' dy='+dy);
        checked++;
      }
    }
    return {checked,errors};
  };
};
const results = {mode:'Isolated host-shaped DOM, actual source and browser; no model requests or native desktop FPS claim.',cases:[]};
async function fixture(browser,{style='quiet',calls=120,groups=1,nested=true,cap=0}={}){
  const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  await page.route('https://dsh-tree-test.invalid/',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://dsh-tree-test.invalid/',{waitUntil:'networkidle'});await page.evaluate(setup);
  await page.addScriptTag({path:path.join(reactRoot,'react/umd/react.development.js')});
  await page.addScriptTag({content:tested});
  await page.evaluate(()=>{window.plugin=moduleSpec.factory(name=>{if(name==='react')return React;throw Error(name)})});
  await page.evaluate(({style,calls,groups,nested,cap})=>{
    for(const key of ['collect','buildModel','readUpdate','commitUpdate','applySettings','paintCrown']){
      const original=api.TreeView.prototype[key];api.TreeView.prototype[key]=function(...args){count(key);return original.apply(this,args)};
    }
    const start=api.TreeView.prototype.start;api.TreeView.prototype.start=function(...args){instances.add(this);return start.apply(this,args)};
    api.change({treeStyle:style,...api.STYLE_PRESETS[style],growthEnabled:false});
    const css=document.createElement('style');css.textContent=api.CSS;document.head.append(css);
    for(let i=0;i<groups;i++)makeGroup('g'+i,calls,nested);
    if(cap){const body=document.querySelector('[data-step-process-body]');body.style.height=cap+'px';body.style.overflow='auto'}
    window.manager=api.createManager();manager.start();
  },{style,calls,groups,nested,cap});
  await page.evaluate(()=>frames(10));return {page,context,errors};
}
async function test(name,fn){if(process.env.DSH_TEST_FILTER&&!name.includes(process.env.DSH_TEST_FILTER))return;try{const detail=await fn();results.cases.push({name,pass:true,...detail});console.log('PASS',name)}catch(error){results.cases.push({name,pass:false,error:error.stack});console.log('FAIL',name,error.stack)}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2))}}
async function aligned(page){const value=await page.evaluate(()=>checkAlignment());assert.ok(value.checked>0);assert.deepEqual(value.errors,[]);return value.checked}
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})});
  try{
    await test('same-size text, quiet decoration and incremental state',async()=>{
      const {page,context,errors}=await fixture(browser);
      try{
        const samples={};
        for(const kind of ['text','quiet','state']){
          await page.evaluate(kind=>{reset();const h=document.querySelector('[data-disclosure-row]');if(kind==='text')h.firstChild.textContent='工具 0';if(kind==='quiet'){const e=document.createElement('span');e.dataset.dshClaudeQuiet='';h.append(e)}if(kind==='state')document.querySelector('[data-state]').dataset.state='running'},kind);
          await page.evaluate(()=>frames());samples[kind]=await page.evaluate(()=>({stats:{...stats},rectReads}));
          assert.equal(samples[kind].stats.collect||0,0);assert.equal(samples[kind].rectReads,0);
        }
        assert.deepEqual(errors,[]);return {samples};
      }finally{await context.close()}
    });
    await test('quiet fast path, bounded paint and style switches',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:400});
      try{
        const initial=await page.evaluate(()=>({dots:document.querySelectorAll('.dpt-dot').length,halos:document.querySelectorAll('.dpt-halo').length,materials:document.querySelectorAll('.dpt-layer linearGradient,.dpt-layer radialGradient').length,edges:document.querySelectorAll('.dpt-edge').length,strokes:document.querySelectorAll('.dpt-stroke').length,outlineCalls:stats.branchBody||0,pathChars:[...document.querySelectorAll('.dpt-edge')].reduce((s,e)=>s+e.getAttribute('d').length,0)}));
        assert.ok(initial.dots<80);assert.equal(initial.halos,0);assert.equal(initial.materials,0);assert.equal(initial.edges,initial.strokes);assert.equal(initial.outlineCalls,0);
        for(const style of ['classic','botanical','quiet']){
          await page.evaluate(style=>api.change({treeStyle:style,...api.STYLE_PRESETS[style]}),style);await page.evaluate(()=>frames(8));await aligned(page);
          const value=await page.evaluate(()=>({crowns:document.querySelectorAll('.dpt-crown-portal').length,halos:document.querySelectorAll('.dpt-halo').length,strokes:document.querySelectorAll('.dpt-stroke').length}));
          if(style==='botanical'){assert.ok(value.crowns>0);assert.ok(value.halos>0)}else{assert.equal(value.crowns,0);assert.equal(value.halos,0)}
        }
        await page.evaluate(()=>api.change({thicknessDecay:.5}));await page.evaluate(()=>frames());assert.equal(await page.locator('.dpt-stroke').count(),0);
        assert.deepEqual(errors,[]);return {initial};
      }finally{await context.close()}
    });
    await test('row-size changes with unchanged group size, font, leading and zoom',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:8,nested:false});
      try{
        await page.evaluate(()=>{const blocks=document.querySelectorAll('.output');blocks[0].style.height='40px';blocks[1].style.height='40px'});await page.evaluate(()=>frames());
        const before=await page.evaluate(()=>({height:document.querySelector('[data-step-process-content]').getBoundingClientRect().height,y:document.querySelectorAll('.dpt-dot')[1].getBoundingClientRect().top}));
        await page.evaluate(()=>{const blocks=document.querySelectorAll('.output');blocks[0].style.height='60px';blocks[1].style.height='20px'});await page.evaluate(()=>frames());
        const after=await page.evaluate(()=>({height:document.querySelector('[data-step-process-content]').getBoundingClientRect().height,y:document.querySelectorAll('.dpt-dot')[1].getBoundingClientRect().top}));
        assert.equal(before.height,after.height);assert.ok(Math.abs(after.y-before.y-20)<.8);
        for(const [leading,delta] of [[24,0],[0,6],[-4,0]]){await page.evaluate(({leading,delta})=>{document.documentElement.style.setProperty('--dsh-content-font-delta',delta+'px');api.change({leading})},{leading,delta});await page.evaluate(()=>frames());await aligned(page)}
        for(const zoom of [.8,1,1.25,1.5]){await page.evaluate(zoom=>document.body.style.zoom=zoom,zoom);await page.evaluate(()=>frames());await aligned(page)}
        assert.deepEqual(errors,[]);return {before,after};
      }finally{await context.close()}
    });
    await test('outer and capped inner scrolling preserve visible nodes',async()=>{
      const records=[];
      for(const cap of [0,260]){
        const {page,context,errors}=await fixture(browser,{calls:400,cap});
        try{
          for(const fraction of [0,.25,.6,1,0]){
            await page.evaluate(({fraction,cap})=>{const scroller=cap?document.querySelector('[data-step-process-body]'):document.scrollingElement;scroller.scrollTop=(scroller.scrollHeight-scroller.clientHeight)*fraction},{fraction,cap});await page.evaluate(()=>frames(8));
            const visible=await aligned(page),value=await page.evaluate(()=>({dots:document.querySelectorAll('.dpt-dot').length,nodes:[...instances].find(v=>v.model)?.model.nodes.length,motions:[...instances].reduce((s,v)=>s+v.motions.size,0)}));
            assert.ok(value.dots<90);assert.equal(value.motions,0);records.push({cap,fraction,visible,...value});
          }
          assert.deepEqual(errors,[]);
        }finally{await context.close()}
      }
      return {records};
    });
    if(process.env.DSH_CLAUDE_ROW_SKIP_CSS)await test('Claude Style content-visibility preserves visible-call coverage',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:120,nested:false});
      try{
        await page.evaluate(()=>{document.body.dataset.dshClaudeStyle='';for(const el of document.querySelectorAll('.output'))el.style.height='80px'});
        await page.addStyleTag({path:process.env.DSH_CLAUDE_ROW_SKIP_CSS});await page.evaluate(()=>frames());
        await page.evaluate(()=>{for(const row of document.querySelectorAll('[data-chat-flow-kind]'))row.dataset.dshClaudeLaidOut=''});await page.evaluate(()=>frames(10));
        const records=[];
        for(const fraction of [0,.5,1,0]){
          await page.evaluate(f=>{document.scrollingElement.scrollTop=(document.scrollingElement.scrollHeight-innerHeight)*f},fraction);await page.evaluate(()=>frames(10));
          records.push({fraction,checked:await aligned(page),dots:await page.locator('.dpt-dot').count()});
        }
        assert.ok(records.every(row=>row.dots<50));assert.deepEqual(errors,[]);return {records};
      }finally{await context.close()}
    });
    await test('growth, reduced motion and fold restoration',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:6});
      try{
        await page.evaluate(()=>api.change({growthEnabled:true}));await page.evaluate(()=>frames());
        await page.evaluate(()=>{const call=document.createElement('div');call.dataset.chatCallId='fresh';call.innerHTML='<div data-state="running"><div data-disclosure-row>新增工具</div></div>';document.querySelector('[data-subcalls]').prepend(call)});await page.evaluate(()=>frames(3));
        const running=await page.evaluate(()=>[...instances].reduce((s,v)=>s+v.motions.size,0));assert.ok(running>0);
        assert.equal(await page.locator('.dpt-layer mask').count(),0);
        await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>frames());assert.equal(await page.evaluate(()=>[...instances].reduce((s,v)=>s+v.motions.size,0)),0);
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.evaluate(()=>document.querySelector('[data-subcalls]').hidden=true);await page.evaluate(()=>frames());
        await page.evaluate(()=>document.querySelector('[data-subcalls]').hidden=false);await page.evaluate(()=>frames(8));await aligned(page);
        assert.equal(await page.evaluate(()=>[...instances].reduce((s,v)=>s+v.motions.size,0)),0);
        assert.deepEqual(errors,[]);return {running};
      }finally{await context.close()}
    });
    await test('far history sleeps without changing height and restores without growth',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'botanical',groups:24,calls:4,nested:false});
      try{
        const before=await page.evaluate(()=>document.querySelector('[data-step-process-content]').getBoundingClientRect().height);
        await page.evaluate(async()=>{for(const group of document.querySelectorAll('[data-step-process]')){group.scrollIntoView();await frames(3)}});await page.evaluate(()=>frames(8));
        const away=await page.evaluate(()=>{const all=[...instances];return {awake:all.filter(v=>!v.suspended&&!v.stopped).length,sleeping:all.filter(v=>v.suspended).length,firstSleeping:all[0].suspended,height:document.querySelector('[data-step-process-content]').getBoundingClientRect().height,retained:all.filter(v=>v.suspended).some(v=>v.svg||v.edgeGroup||v.defs||v.crownSvg||v.crownLibrary)}});
        assert.equal(away.height,before);assert.equal(away.firstSleeping,true);assert.equal(away.retained,false);assert.ok(away.awake<12);
        await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>frames(10));await aligned(page);
        assert.equal(await page.evaluate(()=>[...instances][0].suspended),false);assert.equal(await page.evaluate(()=>[...instances].reduce((s,v)=>s+v.motions.size,0)),0);
        await page.evaluate(()=>document.querySelector('#flow').replaceChildren());await page.evaluate(()=>frames());
        assert.deepEqual(await page.evaluate(()=>({views:api.resources().views,rows:api.resources().rows,crowns:api.resources().crowns,portals:document.querySelectorAll('.dpt-crown-portal').length})),{views:0,rows:0,crowns:0,portals:0});
        assert.deepEqual(errors,[]);return {before,away};
      }finally{await context.close()}
    });
    await test('new turns do not rescan or remeasure folded historical groups',async()=>{
      const {page,context,errors}=await fixture(browser,{groups:80,calls:1,nested:false});
      try{
        await page.evaluate(()=>{for(const group of document.querySelectorAll('[data-step-process]')){group.querySelector('[data-step-process-body]').hidden=true;group.querySelector('[data-step-process-content]').dataset.historical=''}});await page.evaluate(()=>frames(10));
        await page.evaluate(()=>{
          window.historyWork={fullScans:0,oldRects:0};
          const query=Document.prototype.querySelectorAll;Document.prototype.querySelectorAll=function(selector){if(selector==='[data-step-process-content]')historyWork.fullScans++;return query.call(this,selector)};
          const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(...args){if(this.hasAttribute('data-historical'))historyWork.oldRects++;return rect.apply(this,args)};
          makeGroup('latest',1,false);
        });await page.evaluate(()=>frames(10));
        const work=await page.evaluate(()=>({...historyWork}));assert.deepEqual(work,{fullScans:0,oldRects:0});
        await page.evaluate(()=>document.querySelector('#flow').replaceChildren());await page.evaluate(()=>frames());assert.equal(await page.evaluate(()=>api.resources().views),0);assert.deepEqual(errors,[]);return {work};
      }finally{await context.close()}
    });
    await test('crown ignores unrelated mutations and settings coalesce per frame',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'botanical',calls:10});
      try{
        await page.evaluate(()=>{reset();document.querySelector('#unrelated').append(document.createTextNode('无关变化'))});await page.evaluate(()=>frames());const unrelated=await page.evaluate(()=>({...stats,rectReads}));assert.equal(unrelated.positionCrowns||0,0);assert.equal(unrelated.rectReads,0);
        const positionBefore=await page.evaluate(()=>[...instances].find(v=>!v.stopped).crownSvg.getBoundingClientRect().top);
        await page.evaluate(()=>{const banner=document.createElement('div');banner.style.height='30px';document.querySelector('#flow').prepend(banner)});await page.evaluate(()=>frames());
        const positionAfter=await page.evaluate(()=>[...instances].find(v=>!v.stopped).crownSvg.getBoundingClientRect().top);assert.ok(Math.abs(positionAfter-positionBefore-30)<.8);
        await page.evaluate(()=>{reset();for(let i=0;i<20;i++)api.change({lineWidth:2+i/20})});await page.evaluate(()=>frames(8));
        const settings=await page.evaluate(()=>({...stats}));assert.equal(settings.applySettings,1);assert.ok(settings.paintCrown<=2);await aligned(page);
        await page.screenshot({path:path.join(out,'botanical.png')});
        await page.evaluate(()=>{reset();for(let i=0;i<20;i++)api.change({canopyDensity:.2+i*.04})});await page.evaluate(()=>frames());assert.equal(await page.evaluate(()=>stats.applySettings),1);
        await page.evaluate(()=>manager.stop());await page.evaluate(()=>frames());assert.equal(await page.locator('.dpt-layer,.dpt-crown-portal,.dpt-crown-library,.dpt-crown-probe').count(),0);
        assert.deepEqual(errors,[]);return {unrelated,settings};
      }finally{await context.close()}
    });
    await test('classic growth masks finish and offscreen calls stay static',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:80});
      try{
        await page.evaluate(()=>api.change({growthEnabled:true}));await page.evaluate(()=>frames());
        await page.evaluate(()=>{const e=document.createElement('div');e.dataset.chatCallId='classic-new';e.innerHTML='<div data-state="preparing"><div data-disclosure-row>新增工具</div></div>';document.querySelector('[data-subcalls]').prepend(e)});await page.evaluate(()=>frames(3));
        assert.ok(await page.locator('.dpt-layer mask').count()>0);
        await page.waitForFunction(()=>[...instances].every(v=>v.motions.size===0),null,{timeout:5000});assert.equal(await page.locator('.dpt-layer mask').count(),0);
        await page.evaluate(()=>{const e=document.createElement('div');e.dataset.chatCallId='offscreen-new';e.innerHTML='<div data-state="running"><div data-disclosure-row>远处工具</div></div>';document.querySelector('[data-subcalls]').append(e)});await page.evaluate(()=>frames());assert.equal(await page.locator('.dpt-layer mask').count(),0);
        await page.evaluate(()=>document.querySelector('[data-chat-call-id="offscreen-new"]').scrollIntoView());await page.evaluate(()=>frames(8));
        const late=await page.evaluate(()=>({masks:document.querySelectorAll('.dpt-layer mask').length,motions:[...instances].flatMap(v=>[...v.motions.keys()]),births:[...instances].flatMap(v=>[...v.births])}));
        assert.equal(late.masks,0,JSON.stringify(late));await aligned(page);
        assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('real React settings, shadow preview growth and shared-resource teardown',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:8,cap:260});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();window.effects=[];
          const plugin=window.plugin;
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.style.cssText='position:absolute;left:800px;top:0;width:600px';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(12));
        assert.equal(await page.evaluate(()=>api.resources().views),2);
        await page.getByLabel('风格',{exact:true}).selectOption('botanical');await page.evaluate(()=>frames(10));
        assert.equal(await page.locator('.dpt-crown-portal').count(),2);assert.equal(await page.locator('.dpt-crown-library').count(),1);
        await page.getByLabel('新增分支生长',{exact:true}).selectOption('on');await page.evaluate(()=>frames());await page.getByRole('button',{name:'播放生长',exact:true}).click();await page.evaluate(()=>frames(2));
        const preview=await page.evaluate(()=>[...instances].filter(v=>v.content.getRootNode()!==document).map(v=>({stopped:v.stopped,suspended:v.suspended,inViewport:v.inViewport,nodes:v.model?.nodes.length,replay:v.replayRequested,rect:v.content.getBoundingClientRect().toJSON(),motions:v.motions.size})));
        await page.screenshot({path:path.join(out,'settings.png')});
        assert.ok(preview.some(v=>v.motions>0),JSON.stringify(preview));
        await page.waitForFunction(()=>[...instances].every(v=>v.motions.size===0),null,{timeout:5000});
        await page.evaluate(()=>settingsRoot.unmount());await page.evaluate(()=>frames(8));
        const remaining=await page.evaluate(()=>api.resources());assert.equal(remaining.views,1);assert.equal(remaining.crowns,1);assert.ok(remaining.clips>0);
        await page.evaluate(()=>document.querySelector('[data-step-process-body]').style.height='220px');await page.evaluate(()=>frames());await aligned(page);
        await page.evaluate(()=>effects.forEach(fn=>fn()));await page.evaluate(()=>frames());
        const final=await page.evaluate(()=>api.resources());assert.equal(final.views,0);assert.equal(final.rows,0);assert.equal(final.clips,0);assert.equal(final.crowns,0);assert.equal(final.settingsFrame,0);
        assert.deepEqual(errors,[]);return {remaining,final};
      }finally{await context.close()}
    });
    if(process.env.DSH_COMPOSER_SOURCE)await test('composer ignores decoration and detects marker addition, removal and attributes',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:4});
      try{
        await page.evaluate(()=>window.__ModuleLoader__={load(spec){window.composer=spec.factory(()=>({}))}});await page.addScriptTag({content:fs.readFileSync(process.env.DSH_COMPOSER_SOURCE,'utf8')});
        await page.evaluate(()=>{window.refreshes=0;window.stops=[];composer.apply({configForms:{get(){return {getSnapshot:()=>({status:'ready',value:{enabled:true}}),subscribe:()=>()=>{}}}},effect(fn,key){if(key==='dsh-composer-predictions: coexistence')stops.push(fn())},slots:{entriesOfSlot(){refreshes++;return []},subscribe(){return ()=>{}},inject(){}},get(){return {manifest:{modules:[]}}}})});await page.evaluate(()=>frames());
        await page.evaluate(()=>{refreshes=0;document.querySelector('.dpt-edges').append(document.createElementNS('http://www.w3.org/2000/svg','path'))});await page.evaluate(()=>frames());assert.equal(await page.evaluate(()=>refreshes),0);
        const records=[];
        for(const action of ['add','priority','remove','next-add','next-clear']){
          await page.evaluate(action=>{refreshes=0;if(action==='add'){const e=document.createElement('div');e.id='marker';e.dataset.composerGhost='foreign';document.body.append(e)}if(action==='priority')document.querySelector('#marker').dataset.composerGhostPriority='1';if(action==='remove')document.querySelector('#marker').remove();if(action==='next-add'){const e=document.createElement('div');e.id='hint';document.body.append(e);e.dataset.nextHint='ghost'}if(action==='next-clear')document.querySelector('#hint').removeAttribute('data-next-hint')},action);await page.evaluate(()=>frames());const refreshes=await page.evaluate(()=>window.refreshes);assert.ok(refreshes>=1);records.push({action,refreshes});
        }
        await page.evaluate(()=>stops.forEach(fn=>fn()));assert.deepEqual(errors,[]);return {records};
      }finally{await context.close()}
    });
  }finally{await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2))}
  if(results.cases.some(row=>!row.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
