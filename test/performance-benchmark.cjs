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

const { performance: perf } = require('node:perf_hooks');
const browserPath=process.env.DSH_CHROMIUM_EXECUTABLE;
const styles=(process.env.DPT_STYLES||'off,classic,quiet,botanical').split(',');
const sizes=(process.env.DPT_SIZES||'100,1000').split(',').map(Number);
const repeats=Number(process.env.DPT_REPEATS||3),framesCount=Number(process.env.DPT_FRAMES||90);
const pct=(arr,q)=>{arr=arr.slice().sort((a,b)=>a-b);return arr.length?arr[Math.min(arr.length-1,Math.floor((arr.length-1)*q))]:0};
async function run(browser,{style,calls,repeat}){
 const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(String(x)));
 try{
 await page.route('https://dsh-tree-test.invalid/',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.goto('https://dsh-tree-test.invalid/');await page.evaluate(setup);await page.addScriptTag({path:path.join(reactRoot,'react/umd/react.development.js')});await page.addScriptTag({content:tested});
 await page.evaluate(()=>{window.plugin=moduleSpec.factory(name=>{if(name==='react')return React;throw Error(name)})});
 const setupMs=await page.evaluate(async({style,calls})=>{
   window.benchTiming={};
   for(const key of ['rebuildStructure','selectedEntries','collect','buildModel','readUpdate','computeUpdate','commitUpdate']){
     const orig=api.TreeView.prototype[key]; api.TreeView.prototype[key]=function(...a){let t=performance.now();try{return orig.apply(this,a)}finally{const x=benchTiming[key]||(benchTiming[key]={calls:0,totalMs:0,maxMs:0});const dt=performance.now()-t;x.calls++;x.totalMs+=dt;x.maxMs=Math.max(x.maxMs,dt)}};
   }
   const start=api.TreeView.prototype.start;api.TreeView.prototype.start=function(...args){instances.add(this);return start.apply(this,args)};
   if(style!=='off'){api.change({treeStyle:style,...api.STYLE_PRESETS[style],growthEnabled:false,stateMotion:false});const css=document.createElement('style');css.textContent=api.CSS;document.head.append(css)}
   const t=performance.now();makeGroup('bench',calls,false);
   if(style!=='off'){window.manager=api.createManager();manager.start()}
   await frames(20);return performance.now()-t;
 },{style,calls});
 const m=await page.evaluate(async({n})=>{
   window.benchTiming={};window.rectReads=0;window.stats={};
   const elapsed=[],anchor=[],observer=new PerformanceObserver(list=>{for(const x of list.getEntries())anchor.push(x.duration)});
   try{observer.observe({type:'longtask',buffered:false})}catch{}
   const scroller=document.scrollingElement,max=Math.max(0,scroller.scrollHeight-innerHeight);
   await new Promise(resolve=>{let i=0,prev;function tick(t){if(prev!==undefined)elapsed.push(t-prev);prev=t;const phase=(i%(n/2))/(n/2);scroller.scrollTop=(i<n/2?phase:1-phase)*max;i++;if(i<n)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
   await frames(5);observer.disconnect();
   return {elapsed,longTasks:anchor,timing:benchTiming,rectReads,stats,dots:document.querySelectorAll('.dpt-dot').length,scrollMax:max,views:api.resources().views,rows:api.resources().rows,retainedEdges:[...instances].reduce((sum,v)=>sum+(v.edgeResidency?.size||0),0),retainedNodes:[...instances].reduce((sum,v)=>sum+[...(v.edgeResidency?.values()||[])].reduce((n,r)=>n+1+r.bodyGroup.querySelectorAll('*').length+(r.clip?1+r.clip.querySelectorAll('*').length:0)+(r.flowClip?1+r.flowClip.querySelectorAll('*').length:0),0),0),retainedPathChars:[...instances].reduce((sum,v)=>sum+[...(v.edgeResidency?.values()||[])].reduce((n,r)=>n+[r.bodyGroup,r.clip,r.flowClip].filter(Boolean).flatMap(e=>[e,...e.querySelectorAll('path')]).reduce((x,e)=>x+(e.getAttribute('d')||'').length,0),0),0)};
 },{n:framesCount});
 return {style,calls,repeat,setupMs,frame:{rawMs:m.elapsed,count:m.elapsed.length,p50:pct(m.elapsed,.5),p95:pct(m.elapsed,.95),p99:pct(m.elapsed,.99),max:Math.max(0,...m.elapsed),gt25:m.elapsed.filter(x=>x>25).length,gt50:m.elapsed.filter(x=>x>50).length},longTasks:{rawMs:m.longTasks,count:m.longTasks.length,max:Math.max(0,...m.longTasks)},timing:m.timing,rectReads:m.rectReads,geometry:m.stats,dots:m.dots,rows:m.rows,retainedEdges:m.retainedEdges,retainedNodes:m.retainedNodes,retainedPathChars:m.retainedPathChars,scrollMax:m.scrollMax,errors};
 }finally{await context.close()}
}
(async()=>{const browser=await chromium.launch({headless:true,...(browserPath?{executablePath:browserPath}:{})});const output={description:'Headless Chromium synthetic host-shaped DOM; no DSH host and no native Desktop performance conclusion. Module loaded in all conditions; plugin manager disabled for off; animations off.',host:process.platform+'/'+process.arch,osRelease:require('node:os').release(),node:process.version,chromium:browser.version(),viewport:{width:1100,height:800},sourceHash:require('crypto').createHash('sha256').update(source).digest('hex'),repeats,framesCount,rows:[],failed:[]};
 try{for(const calls of sizes){for(let rep=0;rep<repeats;rep++){for(const style of styles.slice(rep%styles.length).concat(styles.slice(0,rep%styles.length))){try{const x=await run(browser,{style,calls,repeat:rep});output.rows.push(x);console.log(JSON.stringify({style:x.style,calls:x.calls,repeat:x.repeat,p95:x.frame.p95,gt25:x.frame.gt25}));}catch(e){output.failed.push({calls,rep,style,error:String(e)});console.log('FAIL',calls,rep,style,String(e))}}}}}finally{await browser.close();fs.writeFileSync(path.join(out,'perf-results.json'),JSON.stringify(output,null,2))}if(output.failed.length)process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
