// Bench only marked disposable rc.5 hosts. No private profiles or model calls.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { chromium } = require(process.env.DSH_PLAYWRIGHT_MODULE || 'playwright');
const redact = value => String(value).replace(/(token=)[^&\s'\"]+/gi, '$1[redacted]');
const root = path.resolve(process.env.DPT_PERF_TEST_ROOT || '');
if (!process.env.DPT_PERF_TEST_ROOT || !fs.existsSync(path.join(root, '.dpt-disposable-test'))) throw Error('requires a marked disposable test root');
const rootReal = fs.realpathSync(root);
const names = (process.env.DPT_MODES || 'off,baseline,candidate').split(',');
const logs = Object.fromEntries(names.map(name => {
  const filename = process.env[`DPT_HOST_${name.toUpperCase()}_LOG`];
  if (!filename) throw Error(`missing host log for ${name}`);
  const file = fs.realpathSync(filename);
  if (!file.startsWith(rootReal + path.sep)) throw Error('host logs must be inside marked test root');
  const url = fs.readFileSync(file, 'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0];
  if (!url || new URL(url).hostname !== '127.0.0.1') throw Error(`no loopback host URL for ${name}`);
  return [name, url];
}));
const output = path.resolve(process.env.DSH_TEST_OUTPUT || path.join(rootReal, 'speed-results'));
fs.mkdirSync(output,{recursive:true});
const repeats = Number(process.env.DPT_REPEATS || 3);
const duration = Number(process.env.DPT_DURATION_MS || 3000);
const speedSpec = process.env.DPT_SPEEDS || 'slow:200,normal:800,fast:3000,stress:6000';
const speeds = speedSpec.split(',').map(p => {const [name,value] = p.split(':'); const pxps = Number(value); if(!name || !Number.isFinite(pxps) || pxps <= 0) throw Error('invalid speed'); return {name,pxps}});
const styles = (process.env.DPT_STYLES || 'classic,quiet,botanical').split(',');
const pct = (a,q) => {a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*q)]:0};
async function one(browser,mode,style,speed,repeat) {
  const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage(),errors=[];
  page.on('pageerror', error => errors.push(redact(error)));
  try {
    await page.goto(logs[mode],{waitUntil:'networkidle'});
    const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}),close=page.getByRole('button',{name:/^(关闭|Close)$/});
    if(await welcome.isVisible()){await welcome.click();await close.waitFor({state:'visible'})}if(await close.isVisible()){await close.click();await close.waitFor({state:'hidden'})}
    const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Compatibility Fixture'}).first();
    if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();
    await fixture.click();
    const turn=page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first(),activity=page.locator('[data-process-activity]').first();
    if(!await activity.isVisible())await turn.click();if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();
    await page.waitForSelector('[data-step-process-content] [data-chat-call-id]');
    let recordedOptimization = null;
    if(mode!=='off') {
      await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
      const label={classic:'经典曲线',quiet:'安静线条',botanical:'植物手稿'}[style];
      if(!label)throw Error('unsupported style');
      await page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:new RegExp(label)}).click();
      const animation=page.getByRole('switch',{name:'动画'});if(await animation.isChecked())await animation.uncheck();
      if(mode==='disabled'||mode==='enabled'){
        await page.getByText('高级设置',{exact:true}).click();
        const optimization=page.getByRole('switch',{name:'植物滚动优化'});
        await optimization.waitFor({state:'visible'});
        if(mode==='enabled') await optimization.check(); else await optimization.uncheck();
        recordedOptimization=await optimization.isChecked();
        if(recordedOptimization !== (mode==='enabled')) throw Error('optimization switch did not reach requested state');
      }

      await page.getByRole('button',{name:/^(关闭|Close)$/}).click();await page.waitForSelector('[data-step-process-content] .dpt-dot');
    }
    await page.evaluate(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame)});
    const sample=await page.evaluate(async ({pxps,duration}) => {
      const content=document.querySelector('[data-step-process-content]');let target=content.parentElement;
      while(target&&target!==document.body){const css=getComputedStyle(target);if(/auto|scroll/.test(css.overflowY)&&target.scrollHeight>target.clientHeight+10)break;target=target.parentElement}
      if(!target||target===document.body)target=document.scrollingElement;
      const available=Math.max(0,target.scrollHeight-target.clientHeight);
      // Same absolute positions, speed and duration across hosts. Use the same
      // starting location and do not silently clip a run that lacks its range.
      const startY=500, distance=pxps*duration/2000;
      if(available<startY+distance+50)throw Error(`insufficient range: need ${startY+distance+50}, available ${available}`);
      target.scrollTop=startY;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const intervals=[], requestedPositions=[], longTasks=[];
      const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration)});
      try{observer.observe({type:'longtask'})}catch{}
      let started,prev,finish;
      await new Promise(resolve=>{function tick(t){if(started===undefined)started=t;if(prev!==undefined)intervals.push(t-prev);prev=t;const elapsed=Math.min(duration,t-started);const travel=pxps*Math.min(elapsed,duration-elapsed)/1000;target.scrollTop=startY+travel;requestedPositions.push(startY+travel);if(elapsed<duration)requestAnimationFrame(tick);else{finish=t;resolve()}}requestAnimationFrame(tick)});
      await new Promise(requestAnimationFrame);observer.disconnect();
      const contentBox=content.getBoundingClientRect(), contentStyle=getComputedStyle(content), targetStyle=getComputedStyle(target);
      const heights=[...content.children].filter(e=>e.matches('[data-chat-flow-kind]')).slice(0,20).map(e=>e.getBoundingClientRect().height);
      // include the candidate's open shadow tree; document.querySelectorAll alone cannot see its dots.
      const scopes=[content,...[...content.querySelectorAll('*')].map(e=>e.shadowRoot).filter(Boolean)];
      const dots=scopes.flatMap(root=>[...root.querySelectorAll('.dpt-dot')]);
      const hostKeys=new Set([...content.querySelectorAll('[data-chat-anchor-key], [data-chat-call-id]')].flatMap(el=>[el.dataset.chatAnchorKey,el.dataset.chatCallId].filter(Boolean)));
      const matchingDots=dots.filter(el=>hostKeys.has(el.dataset.dptKey)).length;

      return {intervals,longTasks,requestedPositions,finalActualScrollTop:target.scrollTop,actualDurationMs:finish-started,available,startY,distance,contentGap:contentStyle.rowGap,contentPadding:contentStyle.padding,targetViewportHeight:target.clientHeight,targetOverflowY:targetStyle.overflowY,target:target===document.scrollingElement?'document':target.tagName.toLowerCase()+(target.hasAttribute('data-step-process-body')?'[data-step-process-body]':''),calls:content.querySelectorAll('[data-chat-call-id]').length,dots:dots.length,matchingDots,shadowRootCount:scopes.length-1,contentHeight:contentBox.height,firstRowHeights:heights};
    },{pxps:speed.pxps,duration});
    if(mode!=='off' && (!sample.dots || !sample.matchingDots)) throw Error('no process dots with matching host keys');
    if(mode==='enabled' && !sample.shadowRootCount) throw Error('enabled optimization did not create an open shadow tree');
    if(mode==='disabled' && sample.shadowRootCount) throw Error('disabled optimization unexpectedly created a shadow tree');
    return {mode,style,speed,repeat,recordedOptimization,frame:{rawMs:sample.intervals,count:sample.intervals.length,p50:pct(sample.intervals,.5),p95:pct(sample.intervals,.95),p99:pct(sample.intervals,.99),gt25:sample.intervals.filter(v=>v>25).length,gt50:sample.intervals.filter(v=>v>50).length},...sample,intervals:undefined,errors};
  } finally {await context.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})});
 const result={scope:'Isolated rc.5 Web hosts; synthetic completed records; elapsed-time-driven equal pixel scroll speeds; headless Chromium, not Desktop FPS.',system:{platform:process.platform,arch:process.arch,node:process.version,os:os.release()},repeats,durationMs:duration,speeds,rows:[],errors:[]};
 try {
  const jobs=[];for(const speed of speeds){if(names.includes('off'))jobs.push({mode:'off',style:'off',speed});for(const style of styles)for(const mode of names.filter(n=>n!=='off'))jobs.push({mode,style,speed})}
  for(let i=0;i<repeats;i++)for(const job of i%2 ? jobs.slice().reverse() : jobs)try{const row=await one(browser,job.mode,job.style,job.speed,i);result.rows.push(row);console.log(JSON.stringify({mode:job.mode,style:job.style,speed:job.speed.name,repeat:i,p95:row.frame.p95,gt25:row.frame.gt25,calls:row.calls}))}catch(e){result.errors.push({mode:job.mode,style:job.style,speed:job.speed.name,repeat:i,error:redact(e)});console.error('FAIL',job.mode,job.style,job.speed.name,redact(e))}
 } finally {await browser.close();fs.writeFileSync(path.join(output,'host-speed-results.json'),JSON.stringify(result,null,2)+'\n')}
 if(result.errors.length)process.exitCode=1;
})().catch(e=>{console.error(redact(e));process.exitCode=1});
