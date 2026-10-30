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
  getSettings: () => SETTINGS,
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
async function fixture(browser,{style='quiet',calls=120,groups=1,nested=true,cap=0,scale=1}={}){
  const context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:scale}),page=await context.newPage();
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
    await test('botanical scroll optimization is opt-in, persistent, reversible, and has a stylesheet fallback',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'botanical',calls:30,nested:true,cap:260});
      try {
        assert.equal(await page.evaluate(()=>api.getSettings().botanicalScrollOptimization),false,'legacy settings default off');
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='optimization-settings';mount.style.cssText='position:fixed;left:500px;top:0;width:580px;height:700px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(20));
        await page.locator('.dpt-advanced > summary').click();
        const toggle=page.getByRole('switch',{name:'植物滚动优化'});assert.equal(await toggle.isChecked(),false);
        let data=await page.evaluate(()=>{const v=[...instances].find(v=>!v.isPreview&&!v.stopped);return {shadow:!!v.treeShadowHost,dots:v.content.querySelectorAll('.dpt-dot').length,contentHeight:v.content.getBoundingClientRect().height,rowTop:v.content.querySelector('[data-chat-flow-kind]').getBoundingClientRect().top,scrollHeight:v.content.closest('[data-step-process-body]').scrollHeight,preview:[...instances].filter(v=>v.isPreview&&!v.stopped).every(v=>!v.treeShadowHost)}});
        assert.equal(data.shadow,false);assert.ok(data.dots>0);assert.equal(data.preview,true);
        const baselineLayout={contentHeight:data.contentHeight,rowTop:data.rowTop,scrollHeight:data.scrollHeight};
        await page.emulateMedia({reducedMotion:'no-preference'});
        for(const mode of ['replaceSync','adoption']){
          await page.evaluate(mode=>{if(mode==='replaceSync'){window.savedReplaceSync=CSSStyleSheet.prototype.replaceSync;CSSStyleSheet.prototype.replaceSync=function(){throw Error('fixture replaceSync denied')}}else{window.savedAdoption=Object.getOwnPropertyDescriptor(ShadowRoot.prototype,'adoptedStyleSheets');Object.defineProperty(ShadowRoot.prototype,'adoptedStyleSheets',{configurable:true,get(){return []},set(){throw Error('fixture adoption denied')}})}},mode);
          await toggle.check();await page.evaluate(()=>frames(20));await aligned(page);
          data=await page.evaluate(()=>{const v=[...instances].find(v=>!v.isPreview&&!v.stopped);window.lastShadowHost=v.treeShadowHost;return {shadow:!!v.treeShadowHost,nonempty:!v.treeShadowHost.matches(':empty'),markerHidden:v.treeShadowHost.firstElementChild?.hidden,contentHeight:v.content.getBoundingClientRect().height,rowTop:v.content.querySelector('[data-chat-flow-kind]').getBoundingClientRect().top,scrollHeight:v.content.closest('[data-step-process-body]').scrollHeight,innerStyle:v.treeShadowHost?.shadowRoot.querySelector('style')?.textContent.length||0,dots:v.svg.querySelectorAll('.dpt-dot').length,externalDots:v.content.querySelectorAll('.dpt-dot').length,fill:getComputedStyle(v.svg.querySelector('.dpt-edge')).fill,preview:[...instances].filter(v=>v.isPreview&&!v.stopped).every(v=>!v.treeShadowHost)}});
          assert.equal(data.shadow,true);assert.equal(data.nonempty,true);assert.equal(data.markerHidden,true);assert.equal(data.contentHeight,baselineLayout.contentHeight);assert.equal(data.rowTop,baselineLayout.rowTop);assert.equal(data.scrollHeight,baselineLayout.scrollHeight);assert.ok(data.innerStyle>100);assert.ok(data.dots>0);assert.equal(data.externalDots,0);assert.ok(data.fill.startsWith('url('));assert.equal(data.preview,true);
          for(const theme of ['light','dark']) {
            await page.evaluate(theme=>{if(theme==='dark')document.body.setAttribute('data-ds-dark-theme','');else document.body.removeAttribute('data-ds-dark-theme');const v=[...instances].find(v=>!v.isPreview&&!v.stopped);v.model.nodes.find(n=>n.call)?.call.querySelector('[data-state]')?.setAttribute('data-state','running')},theme);await page.evaluate(()=>frames(12));
            const appearance=await page.evaluate(()=>{const v=[...instances].find(v=>!v.isPreview&&!v.stopped),r=[...v.edgeRecords.values()].find(r=>r.texture);return {wood:getComputedStyle(v.svg).getPropertyValue('--dpt-wood').trim(),running:getComputedStyle(v.svg).getPropertyValue('--dpt-state-running').trim(),motion:v.svg.dataset.stateMotion,active:!!v.svg.querySelector('.dpt-dot.dpt-running'),clip:r?.clip?.id,texture:r?.texture?.getAttribute('clip-path'),clipD:r?.silhouette?.getAttribute('d'),pathD:r?.path?.getAttribute('d')}});
            assert.equal(appearance.wood,theme==='dark'?'#ae9a83':'#9c8770');assert.equal(appearance.running,theme==='dark'?'#8ca9cb':'#7190b1');assert.equal(appearance.motion,'on');assert.equal(appearance.active,true);assert.ok(appearance.clip);assert.equal(appearance.texture,'url(#'+appearance.clip+')');assert.equal(appearance.clipD,appearance.pathD);
          }
          await toggle.uncheck();await page.evaluate(()=>frames(20));await aligned(page);
          data=await page.evaluate(()=>{const v=[...instances].find(v=>!v.isPreview&&!v.stopped);return {shadow:!!v.treeShadowHost,dots:v.content.querySelectorAll('.dpt-dot').length,oldHostConnected:window.lastShadowHost.isConnected}});
          assert.equal(data.shadow,false);assert.ok(data.dots>0);assert.equal(data.oldHostConnected,false,'previous isolated host was removed');
          await page.evaluate(mode=>{if(mode==='replaceSync')CSSStyleSheet.prototype.replaceSync=window.savedReplaceSync;else if(window.savedAdoption)Object.defineProperty(ShadowRoot.prototype,'adoptedStyleSheets',window.savedAdoption);else delete ShadowRoot.prototype.adoptedStyleSheets},mode);
        }
        await toggle.check();await page.evaluate(()=>frames(20));
        await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').botanicalScrollOptimization===true);
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});await page.evaluate(()=>frames(12));
        assert.equal(await page.evaluate(()=>[...instances].filter(v=>!v.isPreview).every(v=>v.stopped&&!v.treeShadowHost)),true,'disable removes isolated hosts');
        await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').botanicalScrollOptimization),true);
        await page.evaluate(setup);await page.addScriptTag({path:path.join(reactRoot,'react/umd/react.development.js')});await page.addScriptTag({content:tested});
        await page.evaluate(()=>{window.plugin=moduleSpec.factory(name=>{if(name==='react')return React;throw Error(name)})});assert.equal(await page.evaluate(()=>api.getSettings().botanicalScrollOptimization),true,'reload restores opt-in');
        assert.deepEqual(errors,[]);return {faultModes:['replaceSync','adoption'],reload:true};
      }finally{await context.close()}
    });
    await test('window snapshots retry after compute or paint failures',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'quiet',calls:30,nested:false,cap:260});
      try{
        for(const method of ['computeUpdate','grow']){
          const before=await page.evaluate(async method=>{
            const view=[...instances][0];window.failureOriginal=view[method];window.failureMethod=method;
            const prior={...view.paintedFullBox};window.failureSnapshot=null;view[method]=function(){const snapshot=window.failureSnapshot={painted:{...this.paintedFullBox}};queueMicrotask(()=>{snapshot.dirty=this.dirty});throw Error('intentional-window-test-failure')};
            document.querySelector('[data-chat-flow]').style.width=(prior.width-20)+'px';
            view.replayRequested=method==='grow';view.schedule(1);await frames(5);
            return {prior,...window.failureSnapshot};
          },method);
          assert.ok(before.dirty&1,'failure keeps full-layout dirty flag: '+JSON.stringify({method,before,errors}));assert.deepEqual(before.painted,before.prior,'failed update cannot become the last successful size');
          await page.evaluate(async()=>{const view=[...instances][0];view[window.failureMethod]=window.failureOriginal;view.schedule(32);await frames(12)});
          assert.equal(await page.evaluate(()=>[...instances][0].dirty),0);assert.ok(await page.evaluate(width=>[...instances][0].paintedFullBox.width<width,before.prior.width));
          await aligned(page);
        }
        assert.ok(errors.filter(e=>e.includes('intentional-window-test-failure')).length>=2);
        assert.deepEqual(errors.filter(e=>!e.includes('intentional-window-test-failure')),[]);
      }finally{await context.close()}
    });
    await test('window invalidates cached coordinates when the crown gap changes',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'botanical',calls:24,nested:false,cap:260});
      try{
        await page.evaluate(async()=>{const c=document.querySelector('[data-step-process-content]');c.style.height=c.offsetHeight+'px';await frames(15)});
        const prev=await page.evaluate(()=>[...instances][0].paintedCrownSpace);
        await page.evaluate(async()=>{const c=document.querySelector('[data-step-process-content]'),v=[...instances][0];const gap=parseFloat(getComputedStyle(c).rowGap)||0;c.style.setProperty('--dpt-row-gap',(gap+3)+'px');reset();v.schedule(32);await frames(12)});
        const result=await page.evaluate(()=>({space:[...instances][0].paintedCrownSpace,collects:stats.collect||0}));
        assert.ok(result.space>prev,JSON.stringify({prev,result,errors}));assert.ok(result.collects>0);await aligned(page);assert.deepEqual(errors,[]);
      }finally{await context.close()}
    });
    await test('quantized band preserves visible nodes and invalidations during scrolling',async()=>{
      const checks=[];
      for(const cap of [0,260])for(const style of ['quiet','classic','botanical']){
        const {page,context,errors}=await fixture(browser,{style,calls:120,nested:false,cap});
        try{
          await page.evaluate(()=>frames(20));
          // A redundant window-only notification must not commit an unchanged overlay.
          await page.evaluate(async()=>{reset();[...instances][0].schedule(32);await frames(10)});
          assert.equal(await page.evaluate(()=>stats.commitUpdate||0),0,'stable window should skip redundant commit');
          for(const offset of [0,1,7,31,127,255,256,257,400,1000,3000,1000,257,0]){
            await page.evaluate(({offset,cap})=>{const scroller=cap?document.querySelector('[data-step-process-body]'):document.scrollingElement;scroller.scrollTop=offset},{offset,cap});
            await page.evaluate(()=>frames(10));checks.push({cap,style,offset,visible:await aligned(page)});
          }
          for(const z of ['1.25','0.8','1']){
            await page.evaluate(z=>{document.body.style.zoom=z},z);await page.evaluate(()=>frames(16));await aligned(page);
          }
          // A layout/state invalidation in a stable tile must still be committed.
          await page.evaluate(async()=>{reset();const row=document.querySelector('[data-chat-call-id] [data-state]');row.dataset.state='error';row.querySelector('[data-disclosure-row] span').textContent='changed content';await frames(12)});
          assert.ok(await page.evaluate(()=>stats.commitUpdate||0),'state and text updates must commit');
          await aligned(page);
          await page.evaluate(()=>[...instances][0].suspend());
          assert.equal(await page.locator('.dpt-layer').count(),0);
          await page.evaluate(()=>[...instances][0].resume());await page.evaluate(()=>frames(15));await aligned(page);
          await page.evaluate(()=>manager.stop());assert.equal(await page.locator('.dpt-layer').count(),0);assert.deepEqual(errors,[]);
        }finally{await context.close()}
      }
      return {checkedPositions:checks.length,checks};
    });
    await test('quantized band supports nested calls and two scroll containers',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:120,nested:true,cap:260});
      try{
        await page.evaluate(()=>{const pre=document.createElement('div');pre.style.height='400px';document.body.prepend(pre);const post=document.createElement('div');post.style.height='800px';document.body.append(post)});await page.evaluate(()=>frames(12));
        for(const outer of [0,120,300])for(const inner of [0,30,255,257,800,2200,257,0]){
          await page.evaluate(({outer,inner})=>{document.scrollingElement.scrollTop=outer;document.querySelector('[data-step-process-body]').scrollTop=inner},{outer,inner});
          await page.evaluate(()=>frames(12));await aligned(page);
        }
        assert.deepEqual(errors,[]);
      }finally{await context.close()}
    });
    await test('empty rows gain nodes on text insertion or character data without stream rescans',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:1,nested:false});
      try {
        await page.evaluate(()=>{
          const content=document.querySelector('[data-step-process-content]');
          for(const key of ['late-child','late-data','remain-empty']){
            const row=document.createElement('div'); row.dataset.chatFlowKind='reasoning'; row.dataset.chatAnchorKey=key;
            row.innerHTML='<div data-variant="think"><div data-disclosure-row><span></span></div></div>';
            if(key==='late-data')row.querySelector('span').append(document.createTextNode(''));
            content.append(row);
          }
        }); await page.evaluate(()=>frames(15));
        const keys=()=>page.evaluate(()=>[...instances][0].structure.map(e=>e.key));
        assert.deepEqual(await keys(),['g0-0']);
        await page.evaluate(()=>{reset();document.querySelector('[data-chat-anchor-key="late-child"] span').textContent='hello'});
        await page.waitForFunction(()=>[...document.querySelectorAll('.dpt-dot')].some(e=>e.dataset.dptKey==='late-child'),null,{timeout:5000});
        await page.evaluate(()=>frames(10));
        assert.ok((await keys()).includes('late-child'));
        await page.evaluate(()=>{reset();document.querySelector('[data-chat-anchor-key="late-child"] span').firstChild.data='hello again'});
        await page.evaluate(()=>frames(10));
        assert.equal(await page.evaluate(()=>stats.collect||0),0,'already indexed text changes do not cause a tree layout');
        await page.evaluate(()=>document.querySelector('[data-chat-anchor-key="late-data"] span').firstChild.data='second');
        await page.waitForFunction(()=>[...document.querySelectorAll('.dpt-dot')].some(e=>e.dataset.dptKey==='late-data'),null,{timeout:5000});
        assert.ok(!(await keys()).includes('remain-empty'));
        await page.evaluate(()=>document.querySelector('[data-chat-anchor-key="remain-empty"]').remove());await page.evaluate(()=>frames(10));
        assert.equal(await page.evaluate(()=>[...instances][0].emptyRows.size),0,'removed empty row is released');
        await page.evaluate(()=>{const content=document.querySelector('[data-step-process-content]');for(const key of ['offscreen-one','offscreen-two']){const row=document.createElement('div');row.dataset.chatFlowKind='reasoning';row.dataset.chatAnchorKey=key;row.innerHTML='<div data-variant="think"><div data-disclosure-row><span></span></div></div>';content.append(row)}});
        await page.evaluate(()=>frames(10));
        await page.evaluate(async()=>{const view=[...instances][0];view.inViewport=false;document.querySelector('[data-chat-anchor-key="offscreen-one"] span').textContent='one';await Promise.resolve()});
        assert.equal(await page.evaluate(()=>[...instances][0].emptyRows.size),1,'only still-empty rows remain watched offscreen');
        await page.evaluate(async()=>{document.querySelector('[data-chat-anchor-key="offscreen-two"] span').textContent='two';await Promise.resolve()});
        assert.equal(await page.evaluate(()=>[...instances][0].emptyObserver),null,'observer disconnects without waiting for an offscreen render');
        await page.evaluate(()=>{const view=[...instances][0];view.inViewport=true;view.schedule()});await page.evaluate(()=>frames(10));
        assert.ok((await keys()).includes('offscreen-one'));assert.ok((await keys()).includes('offscreen-two'));
        await page.evaluate(()=>{const row=document.createElement('div');row.dataset.chatFlowKind='reasoning';row.dataset.chatAnchorKey='after-resume';row.innerHTML='<div data-variant="think"><div data-disclosure-row><span></span></div></div>';document.querySelector('[data-step-process-content]').append(row)});
        await page.evaluate(()=>frames(10));
        await page.evaluate(()=>[...instances][0].suspend());
        assert.equal(await page.evaluate(()=>[...instances][0].emptyObserver),null,'suspend disconnects empty-row observer');
        await page.evaluate(()=>[...instances][0].resume());await page.evaluate(()=>frames(10));
        await page.evaluate(()=>{document.querySelector('[data-chat-anchor-key="after-resume"] span').textContent='restored'});
        await page.waitForFunction(()=>[...document.querySelectorAll('.dpt-dot')].some(e=>e.dataset.dptKey==='after-resume'),null,{timeout:5000});
        await page.evaluate(()=>manager.stop());
        assert.equal(await page.evaluate(()=>[...instances][0].emptyObserver),null);
        assert.equal(await page.evaluate(()=>[...instances][0].emptyRows.size),0);
        assert.deepEqual(errors,[]); return {};
      }finally{await context.close()}
    });
    await test('classic intensity controls apply the wider presets and preserve saved custom widths',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:2,nested:false});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();api.change({treeStyle:'classic',intensity:'standard',lineWidth:2.8,dotSize:5.6});window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='intensity-settings';mount.style.cssText='position:fixed;left:500px;top:0;width:590px;height:750px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(12));
        await page.locator('.dpt-advanced > summary').click();const width=page.getByLabel('线宽',{exact:true});
        assert.equal(Number(await width.inputValue()),2.8,'a saved old preset is not silently overwritten');
        assert.ok(await page.getByText('沿用旧版强度线宽；重新选择强度可应用新预设').isVisible());
        for(const [name,expected,dot] of [['轻',3.1,4.76],['标准',3.8,5.6],['鲜明',4.64,6.72]]){
          const button=page.getByRole('radio',{name,exact:true});await button.click();await page.evaluate(()=>frames(8));
          assert.equal(Number(await width.inputValue()),expected);assert.equal(await button.getAttribute('aria-checked'),'true');
          assert.equal(await page.evaluate(()=>api.getSettings().dotSize),dot);
        }
        await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').lineWidth===4.64);
        await width.fill('12');await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),12);assert.equal(await page.evaluate(()=>api.getSettings().lineWidth),12);
        await page.getByRole('radio',{name:'标准',exact:true}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),3.8);
        await page.getByRole('radio',{name:/植物手稿/}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),4.6,'botanical uses its own updated preset');
        await page.getByRole('radio',{name:/安静线条/}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),1.5,'quiet intensity remains unchanged');
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('botanical intensity controls apply the narrower presets and preserve saved widths',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'botanical',calls:2,nested:false});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();api.change({treeStyle:'botanical',intensity:'standard',lineWidth:5.6,dotSize:5.6});window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='intensity-settings';mount.style.cssText='position:fixed;left:500px;top:0;width:590px;height:750px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(12));
        await page.locator('.dpt-advanced > summary').click();const width=page.getByLabel('线宽',{exact:true});
        assert.equal(Number(await width.inputValue()),5.6,'a saved old preset is not silently overwritten');
        assert.ok(await page.getByText('沿用旧版强度线宽；重新选择强度可应用新预设').isVisible());
        for(const [name,expected,dot] of [['轻',3.2,4.76],['标准',4.6,5.6],['鲜明',6.28,6.72]]){
          const button=page.getByRole('radio',{name,exact:true});await button.click();await page.evaluate(()=>frames(8));
          assert.equal(Number(await width.inputValue()),expected);assert.equal(await button.getAttribute('aria-checked'),'true');
          assert.equal(await page.evaluate(()=>api.getSettings().dotSize),dot);
        }
        await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').lineWidth===6.28);
        await width.fill('12');await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),12);assert.equal(await page.evaluate(()=>api.getSettings().lineWidth),12);
        await page.getByRole('radio',{name:'标准',exact:true}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),4.6);
        await page.getByRole('radio',{name:/经典曲线/}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),3.8,'classic intensity remains unchanged');
        await page.getByRole('radio',{name:/安静线条/}).click();await page.evaluate(()=>frames(8));
        assert.equal(Number(await width.inputValue()),1.5,'quiet intensity remains unchanged');
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('state colors remain independent across themes, styles, preview and reload',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:3,nested:true});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();
          document.querySelector('[data-chat-call-id="g0-1"] > [data-state]').dataset.state='running';
          document.querySelector('[data-chat-call-id="g0-2"] > [data-state]').dataset.state='error';
          window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='colors-settings';mount.style.cssText='position:fixed;left:500px;top:0;width:590px;height:750px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(14));
        const fill=(selector)=>page.locator(selector).first().evaluate(el=>getComputedStyle(el).fill);
        const chatRun='#flow .dpt-dot.dpt-running', chatError='#flow .dpt-dot.dpt-error';
        const previewRun='.dpt-preview-stage .dpt-dot.dpt-running', previewError='.dpt-preview-stage .dpt-dot.dpt-error';
        assert.equal(await fill(chatRun),'rgb(113, 144, 177)');
        assert.equal(await fill(chatError),'rgb(199, 118, 110)');
        assert.equal(await page.getByLabel('浅色运行颜色值').inputValue(),'#7190B1');
        assert.equal(await page.getByLabel('深色错误颜色值').inputValue(),'#D59188');
        await page.getByLabel('浅色运行颜色值').fill('#3478A2');
        await page.getByLabel('浅色错误颜色选择').fill('#c85140');
        await page.getByLabel('深色运行颜色值').fill('#2A5BB1');
        await page.getByLabel('深色错误颜色值').fill('#B24F75');
        await page.getByLabel('预览状态').selectOption('running');
        await page.getByLabel('预览主题').selectOption('light');await page.evaluate(()=>frames(10));
        assert.equal(await fill(chatRun),'rgb(52, 120, 162)');
        assert.equal(await fill(chatError),'rgb(200, 81, 64)');
        assert.equal(await fill('#flow .dpt-edge.dpt-live'),'rgb(52, 120, 162)');
        assert.equal(await fill('#flow .dpt-edge.dpt-error'),'rgb(200, 81, 64)');
        assert.equal(await fill(previewRun),'rgb(52, 120, 162)');
        await page.getByLabel('预览主题').selectOption('dark');await page.evaluate(()=>frames(8));
        assert.equal(await fill(previewRun),'rgb(42, 91, 177)');
        assert.equal(await fill(chatRun),'rgb(52, 120, 162)','preview theme does not change chat');
        await page.getByLabel('预览状态').selectOption('error');await page.evaluate(()=>frames(8));
        assert.equal(await fill(previewError),'rgb(178, 79, 117)');
        await page.locator('.dpt-preview-stage').screenshot({path:path.join(out,'state-colors-preview-dark.png')});
        await page.evaluate(()=>document.body.setAttribute('data-ds-dark-theme',''));await page.evaluate(()=>frames(8));
        assert.equal(await fill(chatRun),'rgb(42, 91, 177)');
        assert.equal(await fill(chatError),'rgb(178, 79, 117)');
        await page.getByLabel('预览主题').selectOption('current');await page.evaluate(()=>frames(8));
        assert.equal(await fill(previewError),'rgb(178, 79, 117)');
        await page.evaluate(()=>{document.body.removeAttribute('data-ds-dark-theme');document.documentElement.setAttribute('data-ds-dark-theme','')});
        await page.evaluate(()=>frames(8));assert.equal(await fill(chatRun),'rgb(42, 91, 177)');
        await page.getByRole('radio',{name:/安静线条/}).click();await page.evaluate(()=>frames(10));
        assert.equal(await fill(chatRun),'rgb(42, 91, 177)');assert.equal(await fill(chatError),'rgb(178, 79, 117)');
        const quietStroke=await page.locator('#flow .dpt-edge.dpt-live').first().evaluate(el=>getComputedStyle(el).stroke);
        assert.notEqual(quietStroke,'rgb(42, 91, 177)','quiet branches remain neutral');
        await page.getByRole('radio',{name:/植物手稿/}).click();await page.evaluate(()=>frames(12));
        assert.equal(await fill(chatRun),'rgb(42, 91, 177)');assert.equal(await fill(chatError),'rgb(178, 79, 117)');
        assert.notEqual(await fill('#flow .dpt-edge.dpt-live'),'rgb(42, 91, 177)','botanical branches retain their wood');
        await page.locator('.dpt-advanced > summary').click();await page.getByLabel('缩进',{exact:true}).fill('33');
        await page.waitForFunction(()=>{const x=JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}');return x.runningColorLight==='#3478a2'&&x.errorColorLight==='#c85140'&&x.runningColorDark==='#2a5bb1'&&x.errorColorDark==='#b24f75'&&x.treeStyle==='botanical'&&x.indent===33});
        await page.evaluate(()=>document.getElementById('colors-settings').style.width='320px');await page.evaluate(()=>frames(8));
        const overflow=await page.locator('.dpt-colors').evaluate(el=>el.scrollWidth>el.clientWidth||[...el.children].some(child=>child.scrollWidth>child.clientWidth));
        assert.equal(overflow,false,'color controls fit a narrow settings panel');
        await page.locator('.dpt-colors').scrollIntoViewIfNeeded();
        const unobscured=await page.locator('.dpt-colors').evaluate(el=>[...el.children].every(child=>{
          const r=child.getBoundingClientRect(),hit=document.elementFromPoint(r.left+8,r.top+8);return hit===child||child.contains(hit);
        }));
        assert.equal(unobscured,true,'the preview does not cover color controls');
        await page.locator('.dpt-colors').screenshot({path:path.join(out,'state-colors-controls.png')});
        await page.reload();
        assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').runningColorLight),'#3478a2','saved color survives document reload');
        await page.evaluate(setup);
        await page.addScriptTag({path:path.join(reactRoot,'react/umd/react.development.js')});
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.addScriptTag({content:tested});
        await page.evaluate(()=>{
          window.plugin=moduleSpec.factory(name=>{if(name==='react')return React;throw Error(name)});window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='colors-settings';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(10));
        assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').runningColorLight),'#3478a2','initializing the module preserves saved color');
        assert.equal(await page.evaluate(()=>api.normalize(JSON.parse(localStorage.getItem('dsh.process-tree.v1'))).runningColorLight),'#3478a2','saved settings normalize correctly');
        assert.equal(await page.evaluate(()=>window[Symbol.for('dsh.process-tree.pending-settings')]?.runningColorLight??null),null,'no pending edit overrides saved settings');
        assert.equal(await page.evaluate(()=>api.getSettings().runningColorLight),'#3478a2','the initialized module reads the saved color');
        assert.equal(await page.getByLabel('浅色运行颜色值').inputValue(),'#3478A2');
        assert.equal(await page.getByLabel('浅色错误颜色值').inputValue(),'#C85140');
        assert.equal(await page.getByLabel('深色运行颜色值').inputValue(),'#2A5BB1');
        assert.equal(await page.getByLabel('深色错误颜色值').inputValue(),'#B24F75');
        await page.locator('.dpt-advanced > summary').click();assert.equal(await page.getByLabel('缩进',{exact:true}).inputValue(),'33');
        const input=page.getByLabel('浅色运行颜色值');await input.fill('#NOPE');await input.blur();
        assert.equal(await input.inputValue(),'#3478A2','invalid color restores the previous value');
        await page.getByRole('button',{name:'恢复状态颜色'}).click();await page.evaluate(()=>frames(8));
        assert.equal(await input.inputValue(),'#7190B1');
        assert.equal(await page.getByLabel('深色错误颜色值').inputValue(),'#D59188');
        assert.equal(await page.getByRole('radio',{name:/植物手稿/}).getAttribute('aria-checked'),'true','color reset preserves style');
        assert.equal(await page.getByLabel('缩进',{exact:true}).inputValue(),'33','color reset preserves other settings');
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});
        assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--dpt-running-light')),'');
        assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('last top-level fork joins the trunk smoothly without changing other rows',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:4,nested:false});
      try{
        await page.evaluate(()=>{
          const content=document.querySelector('[data-step-process-content]');
          const think=document.createElement('div');
          think.dataset.chatFlowKind='reasoning';think.dataset.chatAnchorKey='last-think';
          think.innerHTML='<div data-variant="think"><div data-disclosure-row>思考</div></div>';
          content.insertBefore(think,content.lastElementChild);
        });await page.evaluate(()=>frames(10));
        const sample=()=>page.evaluate(()=>{
          const view=[...instances].find(v=>!v.stopped&&v.model);
          const trunk=view.model.edges.find(e=>e.key==='trunk:to:g0-3');
          const branch=view.model.edges.find(e=>e.key==='topbranch:g0-3');
          const earlier=view.model.edges.find(e=>e.key==='trunk:to:g0-1');
          const earlierBranch=view.model.edges.find(e=>e.key==='topbranch:g0-1');
          const read=e=>view.edgeRecords.get(e.key).path.dataset;
          return {trunkStart:+read(trunk).startWidth,trunkEnd:+read(trunk).endWidth,
            branchStart:+read(branch).startWidth,earlierEnd:+read(earlier).endWidth,
            earlierSource:earlierBranch.sourceWidth,dotRadius:+view.dotEls.get('dot:last-think').getAttribute('r')};
        });
        const samples=[];let dotRadius;
        for(const fusion of [.3,0,.15,.7,1]){
          await page.evaluate(fusion=>api.change({rootFusion:fusion,lineWidth:12,thicknessDecay:.6,indent:30,dotFollowWidth:true}),fusion);
          await page.evaluate(()=>frames(8));
          const result=await sample();samples.push({fusion,...result});
          if(fusion===.3)await page.locator('[data-step-process-content]').screenshot({path:path.join(out,'last-top-level-fork.png')});
          assert.ok(Math.abs(result.trunkEnd-result.branchStart)<.002,JSON.stringify({fusion,...result}));
          assert.ok(result.trunkEnd<=result.trunkStart+.002,JSON.stringify({fusion,...result}));
          assert.ok(Math.abs(result.earlierEnd-result.earlierSource)<.002,JSON.stringify({fusion,...result}));
          if(dotRadius===undefined)dotRadius=result.dotRadius;else assert.equal(result.dotRadius,dotRadius);
        }
        await page.evaluate(()=>api.change({rootFusion:.3}));await page.evaluate(()=>frames(8));
        const terminal=await sample();
        await page.evaluate(()=>{
          const think=document.createElement('div');think.dataset.chatFlowKind='reasoning';think.dataset.chatAnchorKey='trailing-think';
          think.innerHTML='<div data-variant="think"><div data-disclosure-row>之后的思考</div></div>';
          document.querySelector('[data-step-process-content]').append(think);
        });await page.evaluate(()=>frames(10));
        const continuing=await sample();
        assert.ok(continuing.trunkEnd>terminal.trunkEnd+.1,'a later row restores the full trunk width at this fork');
        assert.equal(continuing.dotRadius,terminal.dotRadius,'the earlier thinking dot is unchanged');
        await page.evaluate(()=>document.querySelector('[data-chat-anchor-key="trailing-think"]').hidden=true);await page.evaluate(()=>frames(10));
        const hidden=await sample();
        assert.ok(Math.abs(hidden.trunkEnd-hidden.branchStart)<.002,'a hidden trailing row does not prevent the terminal join');
        await page.evaluate(()=>{const row=document.querySelector('[data-chat-anchor-key="trailing-think"]');row.hidden=false;row.style.display='none'});await page.evaluate(()=>frames(10));
        const cssHidden=await sample();
        assert.ok(Math.abs(cssHidden.trunkEnd-cssHidden.branchStart)<.002,'a CSS-hidden trailing row does not prevent the terminal join');
        assert.deepEqual(errors,[]);return {samples,terminal,continuing,hidden,cssHidden};
      }finally{await context.close()}
    });
    await test('viewport windows do not make intermediate top-level forks terminal',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:120,nested:false,cap:260});
      try{
        await page.evaluate(()=>api.change({rootFusion:.3,lineWidth:12,thicknessDecay:.6,indent:30}));await page.evaluate(()=>frames(10));
        const read=()=>page.evaluate(()=>{
          const view=[...instances].find(v=>!v.stopped&&v.model), rows=view.model.nodes.filter(n=>n.depth===1);
          const last=rows.at(-1), trunk=view.model.edges.find(e=>e.key==='trunk:to:'+last.key), branch=view.model.edges.find(e=>e.key==='topbranch:'+last.key);
          if(!trunk||!branch)return {last:last.key,total:view.roots.length,hasPaths:false};
          const end=+view.edgeRecords.get(trunk.key).path.dataset.endWidth;
          return {last:last.key,total:view.roots.length,hasPaths:true,end,source:branch.sourceWidth};
        });
        const early=await read();assert.equal(early.total,120);assert.ok(early.hasPaths);assert.notEqual(early.last,'g0-119');
        assert.ok(Math.abs(early.end-early.source)<.002,JSON.stringify(early));
        await page.evaluate(()=>{const body=document.querySelector('[data-step-process-body]');body.scrollTop=body.scrollHeight});await page.evaluate(()=>frames(15));
        const late=await page.evaluate(()=>{
          const view=[...instances].find(v=>!v.stopped&&v.model),trunk=view.model.edges.find(e=>e.key==='trunk:to:g0-119'),branch=view.model.edges.find(e=>e.key==='topbranch:g0-119');
          return {present:!!trunk&&!!branch,end:trunk?+view.edgeRecords.get(trunk.key).path.dataset.endWidth:null,start:branch?+view.edgeRecords.get(branch.key).path.dataset.startWidth:null};
        });
        assert.ok(late.present,JSON.stringify(late));assert.ok(Math.abs(late.end-late.start)<.002,JSON.stringify(late));
        assert.deepEqual(errors,[]);return {early,late};
      }finally{await context.close()}
    });
    await test('nested stem tapers smoothly into its last fork at every fusion level',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:4});
      try{
        const samples=[];
        for(const fusion of [0,.15,.3,.7,1]){
          await page.evaluate(fusion=>api.change({rootFusion:fusion,lineWidth:8,thicknessDecay:.6,indent:30}),fusion);
          await page.evaluate(()=>frames(8));
          const result=await page.evaluate(()=>{
            const view=[...instances].find(v=>v.model?.edges.some(e=>e.type==='trunk-child'));
            const stem=view.model.edges.find(e=>e.type==='trunk-child');
            const fork=view.model.edges.find(e=>e.type==='branch' && Math.abs(e.curve[0][0].y-stem.stemEnd)<.01 && Math.abs(e.curve[0][0].x-stem.curve[0][0].x)<.01);
            const stemPath=view.edgeRecords.get(stem.key).path, forkPath=view.edgeRecords.get(fork.key).path;
            return {start:+stemPath.dataset.startWidth,end:+stemPath.dataset.endWidth,forkStart:+forkPath.dataset.startWidth,span:stem.stemEnd-stem.taperStart};
          });
          assert.ok(result.span>0);assert.ok(Math.abs(result.end-result.forkStart)<.002,JSON.stringify({fusion,...result}));
          assert.ok(result.end<=result.start+.002,JSON.stringify({fusion,...result}));samples.push({fusion,...result});
          if(fusion===0)await page.screenshot({path:path.join(out,'low-fusion-fork.png')});
        }
        assert.deepEqual(errors,[]);return {samples};
      }finally{await context.close()}
    });
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
    await test('style cards render miniature conversations and remain selectable',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:1});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();document.querySelector('#flow').remove();window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='settings-cards';mount.style.cssText='position:absolute;left:0;top:0;width:900px';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(12));
        for(const name of ['经典曲线','植物手稿','安静线条']){
          const card=page.getByRole('radio',{name:new RegExp(name)});await card.click();
          assert.equal(await card.getAttribute('aria-checked'),'true');
          assert.equal(await card.locator('svg text').count(),3);
          assert.ok(await card.locator('svg .dpt-edge').count()>0);
        }
        await page.getByRole('radio',{name:/植物手稿/}).click();await page.evaluate(()=>frames(8));
        await page.locator('.dpt-cards').screenshot({path:path.join(out,'style-cards-light.png')});
        await page.evaluate(()=>{document.documentElement.dataset.dsDarkTheme='';document.body.style.background='#17191b';document.body.style.color='#e4e4e4';document.documentElement.style.setProperty('--dsw-alias-bg-base','#17191b');document.documentElement.style.setProperty('--dsw-alias-label-primary','#e4e4e4');document.documentElement.style.setProperty('--dsw-alias-label-secondary','#c5c5c5');document.documentElement.style.setProperty('--dsw-alias-label-tertiary','#aaa');document.documentElement.style.setProperty('--dsw-alias-bg-layer-1','#242629')});
        await page.locator('.dpt-cards').screenshot({path:path.join(out,'style-cards-dark.png')});
        await page.evaluate(()=>{document.querySelector('#settings-cards').style.width='390px'});await page.evaluate(()=>frames(6));
        const overflow=await page.evaluate(()=>{const cards=document.querySelector('.dpt-cards');return cards.scrollWidth>cards.clientWidth});assert.equal(overflow,false);
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('botanical soil follows the crown and its setting applies to chat and preview',async()=>{
      const {page,context,errors}=await fixture(browser,{style:'classic',calls:4,scale:2});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.style.cssText='position:fixed;left:500px;top:0;width:590px;height:750px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });await page.evaluate(()=>frames(12));
        await page.getByRole('radio',{name:/植物手稿/}).click();await page.evaluate(()=>frames(12));
        await page.locator('.dpt-advanced > summary').click();
        const soil=page.getByLabel('土壤装饰');assert.equal(await soil.inputValue(),'on');
        const state=()=>page.evaluate(()=>[...instances].filter(v=>!v.stopped&&v.crownSvg).map(v=>({preview:v.crownIsPreview,visible:getComputedStyle(v.crownSoil).display!=='none',transform:v.crownSoil.getAttribute('transform'),overflow:v.crownSoil.getBoundingClientRect().bottom-v.crownSvg.getBoundingClientRect().bottom,texture:v.crownSoil.querySelector('.dpt-soil-speckles')?.getAttribute('d')})));
        let crowns=await state();assert.equal(crowns.length,2);assert.ok(crowns.every(c=>c.visible&&c.transform));
        const texture=crowns[0].texture;assert.ok(texture.length>100);assert.equal(crowns[1].texture,texture);
        await page.screenshot({path:path.join(out,'soil-on.png')});
        await page.locator('.dpt-preview-stage').screenshot({path:path.join(out,'soil-detail-light.png')});
        const stageBox=await page.locator('.dpt-preview-stage').boundingBox();
        await page.screenshot({path:path.join(out,'soil-preview.png'),clip:{x:stageBox.x,y:stageBox.y,width:Math.min(180,stageBox.width),height:Math.min(155,stageBox.height)}});
        for(const size of ['0.15','0.35','0.26']){
          await page.getByLabel('树冠大小').fill(size);await page.evaluate(()=>frames(8));
          crowns=await state();assert.ok(crowns.every(c=>c.visible&&c.transform.includes('scale(')&&c.overflow<=1),JSON.stringify({size,crowns}));
          const bridges=await page.evaluate(()=>[...instances].filter(v=>!v.stopped&&v.crownBridge).map(v=>{
            const p=v.crownBridge.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
            return {drop:p[7]-p[1],shift:Math.abs(p[6]-p[0]),endTangent:Math.abs(p[6]-p[4])};
          }));
          assert.ok(bridges.every(b=>b.drop>=b.shift*.75&&b.endTangent<.02),JSON.stringify({size,bridges}));
        }
        await soil.selectOption('off');await page.evaluate(()=>frames(8));crowns=await state();assert.ok(crowns.every(c=>!c.visible));
        await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}').soilEnabled===false);
        await soil.selectOption('on');await page.evaluate(()=>frames(8));crowns=await state();assert.ok(crowns.every(c=>c.visible&&c.texture===texture));
        await page.getByLabel('顶部树冠').selectOption('off');await page.evaluate(()=>frames(8));assert.equal((await state()).length,0);
        await page.getByLabel('顶部树冠').selectOption('on');await page.evaluate(()=>frames(8));crowns=await state();assert.equal(crowns.length,2);assert.ok(crowns.every(c=>c.visible));
        await page.evaluate(()=>{document.documentElement.dataset.dsDarkTheme='';document.documentElement.style.setProperty('--dsw-alias-bg-base','#1d2020');document.documentElement.style.setProperty('--dsw-alias-label-secondary','#d0d4cb');document.body.style.background='#1d2020'});
        await page.evaluate(()=>frames(4));await page.locator('.dpt-preview-stage').screenshot({path:path.join(out,'soil-detail-dark.png')});
        await page.getByRole('radio',{name:/经典曲线/}).click();await page.evaluate(()=>frames(8));assert.equal((await state()).length,0);
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});assert.deepEqual(errors,[]);return {};
      }finally{await context.close()}
    });
    await test('botanical settings preview crown follows sticky panel and inner scrolling',async()=>{
      const {page,context,errors}=await fixture(browser,{calls:1});
      try{
        await page.addScriptTag({path:path.join(reactRoot,'react-dom/umd/react-dom.development.js')});
        await page.evaluate(()=>{
          manager.stop();window.effects=[];
          plugin.apply({effect(fn){const stop=fn();if(stop)effects.push(stop)},slots:{inject(name,fn){return fn()},register(meta,component){window.SettingsPage=component;return ()=>{}}}});
          const mount=document.createElement('div');mount.id='settings-scroll';mount.style.cssText='position:fixed;left:0;top:0;width:1000px;height:360px;overflow:auto';document.body.append(mount);
          window.settingsRoot=ReactDOM.createRoot(mount);settingsRoot.render(React.createElement(SettingsPage));
        });
        await page.evaluate(()=>frames(12));
        await page.getByRole('radio',{name:/植物手稿/}).click();
        await page.locator('.dpt-advanced > summary').click();
        await page.evaluate(()=>frames(10));
        const samples=[];
        for(const scrollTop of [0,60,150,250,100,0]){
          await page.evaluate(y=>document.querySelector('#settings-scroll').scrollTop=y,scrollTop);
          await page.evaluate(()=>frames(5));
          const sample=await page.evaluate(()=>{
            const view=[...instances].find(v=>v.crownIsPreview&&v.crownSvg);
            const header=view.crownHeader.getBoundingClientRect(),crown=view.crownSvg.getBoundingClientRect();
            return {scroll:document.querySelector('#settings-scroll').scrollTop,delta:crown.top-header.top,headerTop:header.top};
          });
          samples.push(sample);assert.ok(Math.abs(sample.delta)<1.5,JSON.stringify(samples));
        }
        await page.evaluate(()=>{const stage=document.querySelector('.dpt-preview-stage');stage.style.maxHeight='110px'});
        await page.evaluate(()=>frames(5));
        for(const scrollTop of [0,40,80,0]){
          await page.evaluate(y=>document.querySelector('.dpt-preview-stage').scrollTop=y,scrollTop);
          await page.evaluate(()=>frames(5));
          const sample=await page.evaluate(()=>{
            const view=[...instances].find(v=>v.crownIsPreview&&v.crownSvg);
            return {scroll:document.querySelector('.dpt-preview-stage').scrollTop,delta:view.crownSvg.getBoundingClientRect().top-view.crownHeader.getBoundingClientRect().top,
              hasArtwork:!!view.crownRoot.querySelector('.dpt-crown-library [data-density]')};
          });
          if(scrollTop)assert.ok(sample.scroll>0);assert.ok(sample.hasArtwork);assert.ok(Math.abs(sample.delta)<1.5,JSON.stringify(sample));
        }
        await page.screenshot({path:path.join(out,'preview-crown.png')});
        await page.evaluate(()=>{settingsRoot.unmount();effects.forEach(fn=>fn())});
        assert.deepEqual(errors,[]);return {samples};
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
        await page.getByRole('radio',{name:/植物手稿/}).click();await page.evaluate(()=>frames(10));
        assert.equal(await page.locator('.dpt-crown-portal').count(),1);assert.equal(await page.evaluate(()=>api.resources().libraries),2);
        await page.getByRole('switch',{name:'动画',exact:true}).check();await page.evaluate(()=>frames());await page.getByRole('button',{name:'播放生长',exact:true}).click();await page.evaluate(()=>frames(2));
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
