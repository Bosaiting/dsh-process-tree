const fs=require('fs'),path=require('path'),crypto=require('crypto');
const redact=value=>String(value).replace(/(token=)[^&\s'"]+/gi,'$1[redacted]');
const {chromium}=require(process.env.DSH_PLAYWRIGHT_MODULE||'playwright');
const logs={off:process.env.DPT_HOST_OFF_LOG,on:process.env.DPT_HOST_ON_LOG};
for(const [key,file] of Object.entries(logs)){if(!file)throw Error('Set DPT_HOST_'+key.toUpperCase()+'_LOG');const m=fs.readFileSync(file,'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/);if(!m)throw Error('isolated host address missing: '+key);logs[key]=m[0];if(new URL(logs[key]).hostname!=='127.0.0.1')throw Error('localhost only')}
const out=process.env.DSH_TEST_OUTPUT||'/private/tmp/dpt-rc5-perf-host-results';fs.mkdirSync(out,{recursive:true});
const repeats=Number(process.env.DPT_REPEATS||3),steps=Number(process.env.DPT_FRAMES||90);
const pct=(a,q)=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*q)]:0};
async function scenario(browser,style,repeat){
 const mode=style==='off'?'off':'on';const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(redact(e)));
 try{
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
 await page.evaluate(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame)});
 const out=await page.evaluate(async({n})=>{
  const root=document.querySelector('[data-step-process-content]');let target=root.parentElement;
  while(target&&target!==document.body){const css=getComputedStyle(target);if(/auto|scroll/.test(css.overflowY)&&target.scrollHeight>target.clientHeight+10)break;target=target.parentElement}if(!target||target===document.body)target=document.scrollingElement;
  const targetName=target===document.scrollingElement?'document':target.tagName.toLowerCase()+(target.getAttribute('data-step-process-body')!==null?'[data-step-process-body]':'');
  const max=Math.max(0,target.scrollHeight-target.clientHeight);if(max<100)throw Error('No substantial scroll range for fixture');
  const intervals=[],longTasks=[];const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration)});try{observer.observe({type:'longtask'})}catch{}
  await new Promise(resolve=>{let i=0,prev;function tick(t){if(prev!==undefined)intervals.push(t-prev);prev=t;const phase=(i%(n/2))/(n/2);target.scrollTop=(i<n/2?phase:1-phase)*max;i++;if(i<n)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
  await new Promise(requestAnimationFrame);observer.disconnect();return {intervals,longTasks,max,targetName,calls:document.querySelectorAll('[data-step-process-content] [data-chat-call-id]').length,dots:document.querySelectorAll('[data-step-process-content] .dpt-dot').length};
 },{n:steps});
 return {style,repeat,frame:{rawMs:out.intervals,p50:pct(out.intervals,.5),p95:pct(out.intervals,.95),p99:pct(out.intervals,.99),gt25:out.intervals.filter(x=>x>25).length},longTasks:out.longTasks,scrollMax:out.max,scrollTarget:out.targetName,hostCalls:out.calls,dots:out.dots,errors};
 }finally{await context.close()}
}
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})}),styles=['off','classic','quiet','botanical'],result={scope:'Isolated DSH 0.2.1-rc.5 Web profiles with synthetic completed session records, no real model requests; not native desktop',repeats,frames:steps,rows:[],errors:[]};try{for(let i=0;i<repeats;i++)for(const style of styles.slice(i%4).concat(styles.slice(0,i%4)))try{const row=await scenario(browser,style,i);result.rows.push(row);console.log(JSON.stringify({style,repeat:i,p95:row.frame.p95,gt25:row.frame.gt25,calls:row.hostCalls}))}catch(e){result.errors.push({style,repeat:i,error:redact(e)});console.error('FAIL',style,i,redact(e))}}finally{await browser.close();fs.writeFileSync(path.join(out,'host-perf-results.json'),JSON.stringify(result,null,2))}if(result.errors.length)process.exitCode=1})().catch(e=>{console.error(redact(e));process.exitCode=1});
