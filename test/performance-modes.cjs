const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.DSH_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
// Two disposable DSH Web profiles, each seeded with 100 completed tool calls.
// Keep before/client.js and after/client.js next to their respective host logs.
assert.ok(process.env.DPT_PERF_ROOT,'Set DPT_PERF_ROOT to a marked disposable comparison directory');
const root=fs.realpathSync(process.env.DPT_PERF_ROOT);
assert.ok(fs.existsSync(path.join(root,'.dpt-disposable-test')),'Requires disposable-root marker');
const urls=Object.fromEntries(['before','after'].map(variant=>{
 const url=fs.readFileSync(path.join(root,variant+'.log'),'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0];
 assert.ok(url&&new URL(url).hostname==='127.0.0.1','Requires loopback host logs');return [variant,url];
}));
const repeats=Number(process.env.REPEATS||3);assert.ok(Number.isInteger(repeats)&&repeats>0&&repeats<=10);
const modes=[{name:'code-function',style:'code',layout:'function'},{name:'code-braces',style:'code',layout:'braces'},{name:'quiet',style:'quiet'},{name:'classic',style:'classic'},{name:'botanical',style:'botanical'}].flatMap(mode=>['before','after'].map(variant=>({...mode,variant,name:variant+'-'+mode.name})));
const frames=p=>p.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame)});
const percentile=(a,q)=>{a=[...a].sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*q)]:0};
const keys=['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize','Nodes','Documents'];
const metrics=async session=>Object.fromEntries((await session.send('Performance.getMetrics')).metrics.filter(m=>keys.includes(m.name)).map(m=>[m.name,m.value]));
async function trial(browser,mode,repeat){
 const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1.25,colorScheme:'dark'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(String(e).replace(/(token=)[^\s&]+/g,'$1[redacted]')));
 try{
 await page.addInitScript(s=>localStorage.setItem('dsh.process-tree.v1',JSON.stringify(s)),{treeStyle:mode.style,codeLayout:mode.layout||'function',codeLanguage:'python'});
 await page.goto(urls[mode.variant],{waitUntil:'networkidle'});
 const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}),close=page.getByRole('button',{name:/^(关闭|Close)$/});
 if(await welcome.isVisible()){await welcome.click();await close.waitFor({state:'visible'})}if(await close.isVisible())await close.click();
 await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();
 const selector=page.getByText('Work details',{exact:true}).locator('..').locator('..').getByRole('button');
 if((await selector.innerText()).trim()!=='Verbose'){await selector.click();await page.getByText('Verbose',{exact:true}).last().click()}
 await page.getByRole('button',{name:/^(关闭|Close)$/}).click();
 const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Compatibility Fixture'}).first();if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();
 const initStart=performance.now();await fixture.click();await page.waitForSelector('[data-step-process-content]');
 if(mode.style==='code'&&mode.layout==='function')await page.waitForFunction(()=>document.querySelectorAll('.dpt-code-expression').length===100);
 await frames(page);const initMs=performance.now()-initStart;
 const geometry=await page.evaluate(()=>{
  const content=document.querySelector('[data-step-process-content]');let target=content.parentElement;while(target!==document.body&&!(target.scrollHeight>target.clientHeight+20&&/auto|scroll/.test(getComputedStyle(target).overflowY)))target=target.parentElement;if(target===document.body)target=document.scrollingElement;
  window.benchScroller=target;
  return{height:content.getBoundingClientRect().height,scrollHeight:target.scrollHeight,clientHeight:target.clientHeight,calls:content.querySelectorAll('[data-chat-call-id]').length,codeExpressions:content.querySelectorAll('.dpt-code-expression').length,style:content.dataset.dptStyle};
 });
 if(geometry.calls!==100)throw Error('wrong fixture count');
 const session=await context.newCDPSession(page);await session.send('Performance.enable');
 const phases=[];
 for(const [name,speed,duration] of [['idle',0,1500],['scroll-800',800,2400],['scroll-3000',3000,2400]]){
  await page.evaluate(()=>{benchScroller.scrollTop=500});await frames(page);
  const before=await metrics(session);
  const sample=await page.evaluate(async({speed,duration})=>{
   const max=benchScroller.scrollHeight-benchScroller.clientHeight;if(max<500+speed*duration/2000+20)throw Error('insufficient scroll range: '+max);
   const intervals=[],tasks=[];const observer=new PerformanceObserver(list=>{for(const x of list.getEntries())tasks.push(x.duration)});observer.observe({type:'longtask'});
   let started,previous;const wall=performance.now();
   await new Promise(resolve=>{function tick(t){if(started===undefined)started=t;if(previous!==undefined)intervals.push(t-previous);previous=t;const elapsed=Math.min(duration,t-started);if(speed)benchScroller.scrollTop=500+speed*Math.min(elapsed,duration-elapsed)/1000;if(elapsed<duration)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
   await new Promise(requestAnimationFrame);observer.disconnect();return{intervals,tasks,elapsed:performance.now()-wall,finalPosition:benchScroller.scrollTop};
  },{speed,duration});
  const after=await metrics(session),delta=Object.fromEntries(keys.filter(k=>k.endsWith('Duration')||k.endsWith('Count')).map(k=>[k,after[k]-before[k]]));
  phases.push({name,speed,duration,...sample,frame:{p50:percentile(sample.intervals,.5),p95:percentile(sample.intervals,.95),max:Math.max(...sample.intervals),gt25:sample.intervals.filter(x=>x>25).length,gt50:sample.intervals.filter(x=>x>50).length,count:sample.intervals.length},metrics:delta,heap:after.JSHeapUsedSize,nodes:after.Nodes});
 }
 const decoration=await page.evaluate(()=>{
  const content=document.querySelector('[data-step-process-content]'),scopes=[content,...[...content.querySelectorAll('*')].map(e=>e.shadowRoot).filter(Boolean)];
  const q=s=>scopes.flatMap(r=>[...r.querySelectorAll(s)]);
  return{allElements:q('*').length,svgElements:q('.dpt-layer *').length,paths:q('.dpt-layer path').length,pathChars:q('.dpt-layer path').reduce((s,p)=>s+(p.getAttribute('d')||'').length,0),dots:q('.dpt-dot').length,codeElements:q('[class^="dpt-code"],.dpt-function-header,.dpt-map-mark').length,isolated:scopes.length>1};
 });
 if(errors.length)throw Error('Page errors: '+errors.join('; '));
 return{mode:mode.name,repeat,initMs,geometry,decoration,phases,errors};
 }finally{await context.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})}),result={scope:'macOS headless Chromium, isolated DSH 0.2.2-rc.1 Web hosts, 100 synthetic tool calls plus 100 reasoning rows; completed idle/scroll, no model requests. Elapsed-time scripted scroll, not desktop FPS.',chromium:browser.version(),node:process.version,platform:process.platform+'/'+process.arch,sourceHashes:Object.fromEntries(['before','after'].map(variant=>[variant,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,variant,'client.js'))).digest('hex')])),rows:[],failures:[]};
 try{for(let repeat=0;repeat<repeats;repeat++)for(const mode of modes.slice(repeat).concat(modes.slice(0,repeat))){if(process.env.MODES&&!process.env.MODES.split(',').includes(mode.name))continue;try{const row=await trial(browser,mode,repeat);result.rows.push(row);console.log(JSON.stringify({mode:mode.name,repeat,initMs:Math.round(row.initMs),phases:row.phases.map(p=>({name:p.name,p95:p.frame.p95,gt25:p.frame.gt25,n:p.frame.count,styleMs:Math.round(p.metrics.RecalcStyleDuration*1000),layoutMs:Math.round(p.metrics.LayoutDuration*1000),scriptMs:Math.round(p.metrics.ScriptDuration*1000),taskMs:Math.round(p.metrics.TaskDuration*1000)}))}));}catch(e){result.failures.push({mode:mode.name,repeat,error:String(e).replace(/(token=)[^\s&]+/g,'$1[redacted]')});console.log('FAIL',mode.name,result.failures.at(-1).error)}fs.writeFileSync(root+'/performance-results.json',JSON.stringify(result,null,2))}}
 finally{await browser.close();fs.writeFileSync(root+'/performance-results.json',JSON.stringify(result,null,2));if(!result.rows.length||result.failures.length)process.exitCode=1}
})().catch(e=>{console.error(String(e).replace(/(token=)[^\s&]+/g,'$1[redacted]'));process.exitCode=1});
