const fs=require('fs'),path=require('path'),crypto=require('crypto');
const redact=value=>String(value).replace(/(token=)[^&\s'"]+/gi,'$1[redacted]');
const {chromium}=require(process.env.DSH_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(process.env.DPT_PERF_TEST_ROOT||'');
if(!process.env.DPT_PERF_TEST_ROOT||!fs.existsSync(path.join(root,'.dpt-disposable-test')))throw Error('requires marked disposable DPT_PERF_TEST_ROOT');
const rootReal=fs.realpathSync(root);
const logs={off:process.env.DPT_HOST_OFF_LOG,on:process.env.DPT_HOST_ON_LOG};
for(const file of Object.values(logs)){if(!file||!fs.realpathSync(file).startsWith(rootReal+path.sep))throw Error('host logs must be inside marked disposable root')}
for(const [key,file] of Object.entries(logs)){if(!file)throw Error('Set DPT_HOST_'+key.toUpperCase()+'_LOG');const m=fs.readFileSync(file,'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/);if(!m)throw Error('isolated host address missing: '+key);logs[key]=m[0];if(new URL(logs[key]).hostname!=='127.0.0.1')throw Error('localhost only')}
const out=process.env.DSH_TEST_OUTPUT||'/private/tmp/dpt-trace-investigation/results';const outdir=out;fs.mkdirSync(out,{recursive:true});
const repeats=Number(process.env.DPT_REPEATS||3),steps=Number(process.env.DPT_FRAMES||90);
const regime=process.env.DPT_REGIME||'stress';
const pct=(a,q)=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*q)]:0};
async function scenario(browser,style,repeat){
 const mode=style==='off'?'off':'on';const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(redact(e)));
 try{
 await page.addInitScript(ablation=>{if(ablation!=='freeze-hook')return;window.__dptBlocked=0;window[Symbol.for('dsh.process-tree.test')]=api=>{if(!api.TreeView)throw Error('TreeView hook missing');const original=api.TreeView.prototype.applySvgSize,initialized=new WeakSet();api.TreeView.prototype.applySvgSize=function(...args){if(!initialized.has(this)){initialized.add(this);return original.apply(this,args)}window.__dptBlocked++}}},process.env.DPT_ABLATION||'none');
 await page.goto(logs[mode],{waitUntil:'networkidle'});
 const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}),close=page.getByRole('button',{name:/^(关闭|Close)$/});
 if(await welcome.isVisible()){await welcome.click();await close.waitFor({state:'visible'})}if(await close.isVisible()){await close.click();await close.waitFor({state:'hidden'})}
 const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Compatibility Fixture'}).first();if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();await fixture.click();
 const turn=page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first(),activity=page.locator('[data-process-activity]').first();if(!await activity.isVisible())await turn.click();if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();
 await page.waitForSelector('[data-step-process-content] [data-chat-call-id]');
 if(mode==='on'){
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  const label={classic:'经典曲线',quiet:'安静线条',botanical:'植物手稿'}[style];await page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:new RegExp(label)}).click();
  const animation=page.getByRole('switch',{name:'动画'});if(await animation.isChecked())await animation.uncheck();
  await page.getByRole('button',{name:/^(关闭|Close)$/}).click();await page.waitForSelector('[data-step-process-content] .dpt-dot');
 }
 await page.evaluate(ablation=>{
  window.__dptAblation={type:ablation,blockedAttr:0,blockedStyle:0,deletedRules:0};
  if(ablation==='freeze-svg-size'){
   const layers=[...document.querySelectorAll('svg.dpt-layer')];const styles=new WeakSet(layers.map(e=>e.style));
   const setAttribute=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){if(this.matches?.('svg.dpt-layer')&&['viewBox','width','height'].includes(name)){window.__dptAblation.blockedAttr++;return}return setAttribute.call(this,name,value)};
   for(const property of ['top','width','height']){let proto=Object.getPrototypeOf(layers[0]?.style);while(proto&&!Object.getOwnPropertyDescriptor(proto,property))proto=Object.getPrototypeOf(proto);const descriptor=proto&&Object.getOwnPropertyDescriptor(proto,property);if(!descriptor?.set)throw Error('missing style setter '+property);Object.defineProperty(proto,property,{...descriptor,set(value){if(styles.has(this)){window.__dptAblation.blockedStyle++;return}return descriptor.set.call(this,value)}})}
  } else if(ablation==='hide-svg') {const style=document.createElement('style');style.textContent='.dpt-layer{visibility:hidden!important}';document.head.append(style)}
  else if(ablation==='freeze-svg-children') {
    const within=node=>node?.nodeType===1&&(node.matches?.('svg.dpt-layer')||node.closest?.('svg.dpt-layer'));
    const originalAppend=Element.prototype.append;Element.prototype.append=function(...items){if(within(this)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+items.length;return}return originalAppend.apply(this,items)};
    const originalAppendChild=Node.prototype.appendChild;Node.prototype.appendChild=function(node){if(within(this)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+1;return node}return originalAppendChild.call(this,node)};
    const originalInsert=Node.prototype.insertBefore;Node.prototype.insertBefore=function(node,reference){if(within(this)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+1;return node}return originalInsert.call(this,node,reference)};
    const originalRemove=Element.prototype.remove;Element.prototype.remove=function(){if(within(this.parentElement)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+1;return}return originalRemove.call(this)};
    const originalRemoveChild=Node.prototype.removeChild;Node.prototype.removeChild=function(node){if(within(this)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+1;return node}return originalRemoveChild.call(this,node)};
    const originalReplace=Element.prototype.replaceChildren;Element.prototype.replaceChildren=function(...items){if(within(this)){window.__dptAblation.blockedChildren=(window.__dptAblation.blockedChildren||0)+1;return}return originalReplace.apply(this,items)};
  }
  else if(ablation==='no-host-has') {const deleted=[];function visit(sheet){let rules;try{rules=sheet.cssRules}catch{return}if(!rules)return;for(let i=rules.length-1;i>=0;i--){const rule=rules[i];if(rule.selectorText?.includes(':has(')&&rule.selectorText.includes('conversation.chat.node')){deleted.push(rule.selectorText);sheet.deleteRule(i)}else if(rule.cssRules)visit(rule)}}for(const sheet of document.styleSheets)visit(sheet);window.__dptAblation.deletedRules=deleted.length;window.__dptAblation.deletedSelectors=deleted;if(!deleted.length)throw Error('host :has selectors not found')}
  else if(ablation==='no-host-css') {const stylesheet=document.querySelector('style[data-plugin="dsh-process-tree"]')?.sheet;if(!stylesheet)throw Error('missing plugin stylesheet');for(let i=stylesheet.cssRules.length-1;i>=0;i--){const rule=stylesheet.cssRules[i];if(rule.selectorText?.includes('.dpt-host')){stylesheet.deleteRule(i);window.__dptAblation.deletedRules++}}}
 },process.env.DPT_ABLATION||'none');
 await page.evaluate(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame)});
 const cdp=await context.newCDPSession(page);
 await cdp.send('Performance.enable');
 const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,toplevel,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.invalidationTracking',transferMode:'ReportEvents'});
 const out=await page.evaluate(async({n,regime})=>{
  const root=document.querySelector('[data-step-process-content]');let target=root.parentElement;
  while(target&&target!==document.body){const css=getComputedStyle(target);if(/auto|scroll/.test(css.overflowY)&&target.scrollHeight>target.clientHeight+10)break;target=target.parentElement}if(!target||target===document.body)target=document.scrollingElement;
  const targetName=target===document.scrollingElement?'document':target.tagName.toLowerCase()+(target.getAttribute('data-step-process-body')!==null?'[data-step-process-body]':'');
  const available=Math.max(0,target.scrollHeight-target.clientHeight);const max=Math.min(regime==='normal'?2000:11000,available);if(max<100)throw Error('No substantial scroll range for fixture');
  const intervals=[],longTasks=[];const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration)});try{observer.observe({type:'longtask'})}catch{}
  await new Promise(resolve=>{let i=0,prev;function tick(t){if(prev!==undefined)intervals.push(t-prev);prev=t;const phase=(i%(n/2))/(n/2);target.scrollTop=(i<n/2?phase:1-phase)*max;i++;if(i<n)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
  await new Promise(requestAnimationFrame);observer.disconnect();return {ablation:{...window.__dptAblation,blockedHook:window.__dptBlocked||0},intervals,longTasks,max,available,targetName,calls:document.querySelectorAll('[data-step-process-content] [data-chat-call-id]').length,dots:document.querySelectorAll('[data-step-process-content] .dpt-dot').length};
 },{n:steps,regime});
 const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await done;
 const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const metricDelta={};for(const name of ['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration','JSHeapUsedSize','Nodes'])metricDelta[name]=(after[name]||0)-(before[name]||0);
 const threadNames=new Map(events.filter(e=>e.ph==='M'&&e.name==='thread_name').map(e=>[e.pid+':'+e.tid,e.args?.name]));
 const timings={};for(const event of events){if(event.ph!=='X'||!event.dur)continue;const name=threadNames.get(event.pid+':'+event.tid)||'';if(name!=='CrRendererMain')continue;const rec=timings[event.name]||(timings[event.name]={count:0,ms:0,max:0});rec.count++;rec.ms+=event.dur/1000;rec.max=Math.max(rec.max,event.dur/1000)}
 const sorted=Object.fromEntries(Object.entries(timings).sort((a,b)=>b[1].ms-a[1].ms).slice(0,35));
 const layout=events.filter(e=>e.ph==='X'&&e.name==='Layout').map(e=>({dur:e.dur/1000,beginData:e.args?.beginData,endData:e.args?.endData})).sort((a,b)=>b.dur-a.dur).slice(0,8);
 const ids=new Set(events.filter(e=>threadNames.get(e.pid+':'+e.tid)==='CrRendererMain').map(e=>e.pid+':'+e.tid));
 const tasks=events.filter(e=>e.ph==='X'&&e.name==='RunTask'&&ids.has(e.pid+':'+e.tid)).map(e=>e.dur/1000).sort((a,b)=>b-a).slice(0,10);
 fs.writeFileSync(path.join(outdir,`trace-${process.env.DPT_ABLATION||'none'}-${regime}-${style}-${repeat}.json`),JSON.stringify(events));
 return {style,repeat,regime,ablation:out.ablation,metricDelta,traceSummary:sorted,layout,tasks,traceEvents:events.length,frame:{rawMs:out.intervals,p50:pct(out.intervals,.5),p95:pct(out.intervals,.95),p99:pct(out.intervals,.99),gt25:out.intervals.filter(x=>x>25).length},longTasks:out.longTasks,scrollMax:out.max,available:out.available,scrollTarget:out.targetName,hostCalls:out.calls,dots:out.dots,errors};
 }finally{await context.close()}
}
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})}),styles=(process.env.DPT_STYLES||'off,classic,quiet,botanical').split(','),result={scope:'Isolated DSH 0.2.1-rc.5 Web profiles with synthetic completed session records, no real model requests; not native desktop',repeats,frames:steps,rows:[],errors:[]};try{for(let i=0;i<repeats;i++)for(const style of styles.slice(i%4).concat(styles.slice(0,i%4)))try{const row=await scenario(browser,style,i);result.rows.push(row);console.log(JSON.stringify({style,repeat:i,p95:row.frame.p95,gt25:row.frame.gt25,calls:row.hostCalls}))}catch(e){result.errors.push({style,repeat:i,error:redact(e)});console.error('FAIL',style,i,redact(e))}}finally{await browser.close();fs.writeFileSync(path.join(out,`trace-summary-${process.env.DPT_ABLATION||'none'}-${regime}.json`),JSON.stringify(result,null,2))}if(result.errors.length)process.exitCode=1})().catch(e=>{console.error(redact(e));process.exitCode=1});
