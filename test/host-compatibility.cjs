// Run only against a disposable host with the test fixture overlay loaded.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const input=process.env.DSH_TEST_HOST_URL || (process.env.DSH_TEST_HOST_LOG && fs.readFileSync(process.env.DSH_TEST_HOST_LOG,'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0]);
if(!input)throw new Error('Set DSH_TEST_HOST_URL or DSH_TEST_HOST_LOG for an isolated host; see docs/COMPATIBILITY.md');
assert.equal(new URL(input).hostname,'127.0.0.1','only use a disposable loopback host');
const out=process.env.DSH_TEST_OUTPUT || path.join(__dirname,'host-results');fs.mkdirSync(out,{recursive:true});
const results={scope:'Real DSH Web, exact plugin package, synthetic Session records, no model requests; no native Desktop FPS claim.',checks:[]};
const frames=page=>page.evaluate(async()=>{for(let i=0;i<10;i++)await new Promise(requestAnimationFrame)});
async function aligned(page){
 const value=await page.evaluate(()=>{
  const root=document.querySelector('[data-step-process-content]'),errors=[];
  const dots=[...root.querySelectorAll('.dpt-dot')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
  let measured=0;
  for(const row of root.querySelectorAll('[data-disclosure-row],[data-sample]')){
   const box=row.getBoundingClientRect(),y=box.top+box.height/2;
   if(!row.checkVisibility()||box.height<1||y<0||y>innerHeight)continue;
   let top=0,bottom=innerHeight;
   for(let parent=row.parentElement;parent;parent=parent.parentElement){
    if(/^(auto|scroll|hidden|clip)$/.test(getComputedStyle(parent).overflowY)){
     const clip=parent.getBoundingClientRect();top=Math.max(top,clip.top);bottom=Math.min(bottom,clip.bottom);
    }
   }
   // Native theme process bodies have their own capped scrolling viewport.
   if(y<top||y>bottom)continue;
   measured++;const gap=Math.min(...dots.map(d=>Math.abs(d.top+d.height/2-y)));
   if(gap>.9)errors.push({gap});
  }
  return {measured,errors,dots:dots.length};
 });assert.ok(value.measured>0,'no visible native header measured');assert.deepEqual(value.errors,[]);return value;
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE?{executablePath:process.env.DSH_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 try{
  await page.goto(input,{waitUntil:'networkidle'});
  const welcome=page.getByRole('button',{name:/^(继续|Continue)$/});
  const close=page.getByRole('button',{name:/^(关闭|Close)$/});
  if(await welcome.isVisible()){
   await welcome.click();
   // Completing welcome opens a second, dismissible account dialog asynchronously.
   await close.waitFor({state:'visible'});
  }
  if(await close.isVisible()){await close.click();await close.waitFor({state:'hidden'})}
  const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Compatibility Fixture'}).first();
  if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();
  await fixture.click();
  const turn=page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first();
  const activity=page.locator('[data-process-activity]').first();
  if(!await activity.isVisible())await turn.click();
  if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();
  await page.waitForSelector('[data-step-process-content] .dpt-dot');await frames(page);
  const boot=await page.evaluate(()=>window.__DSH_BOOT__.entries.filter(e=>['dsh-process-tree','dsh-claude-style'].includes(e.id)).map(e=>e.id));
  assert.ok(boot.includes('dsh-process-tree'));assert.equal(boot.includes('dsh-claude-style'),process.env.DSH_EXPECT_THEME==='1');
  assert.equal(await page.locator('[data-chat-call-id]').count(),6);
  results.checks.push({name:'native transcript and anchors',pass:true,boot,...await aligned(page)});
  // Exercise reasoning folding on an actual host-rendered row. rc.5 filters
  // signature metadata; older hosts need not implement that display behavior.
  const thinking=page.locator('[data-step-process-content] [data-variant="think"]').first();
  const filteredReasoning=process.env.DSH_EXPECT_FILTERED_REASONING==='1';
  assert.ok(await thinking.count());
  if(filteredReasoning) { assert.ok((await thinking.textContent()).includes('Inspect synthetic record 1.')); assert.ok(!(await thinking.textContent()).includes('fixture.metadata')); }
  await thinking.locator('[data-disclosure-row]').click();
  assert.ok((await thinking.textContent()).includes('Inspect synthetic record 1.'));
  if(filteredReasoning)assert.ok(!(await thinking.textContent()).includes('fixture.metadata'));
  await thinking.locator('[data-disclosure-row]').click();await frames(page);
  results.checks.push({name:'reasoning row fold and host-specific metadata handling',pass:true,filteredReasoning,...await aligned(page)});
  // Synthetic empty-row timing inside the actual host DOM; the real stream
  // behavior is exercised separately by host-stream-regression.cjs.
  const emptyKey='fixture-empty-reasoning';
  await page.evaluate(key=>{
   const content=document.querySelector('[data-step-process-content]');
   const row=document.createElement('div');row.dataset.chatFlowKind='reasoning';row.dataset.chatAnchorKey=key;
   row.innerHTML='<div data-variant="think"><div data-disclosure-row style="height:24px"><span></span></div></div>';
   content.insertBefore(row,content.querySelectorAll('[data-chat-flow-kind]')[2]);
  },emptyKey);
  const emptyRow=page.locator('[data-chat-anchor-key="fixture-empty-reasoning"]');
  await emptyRow.scrollIntoViewIfNeeded();await frames(page);
  assert.equal(await page.evaluate(key=>[...document.querySelectorAll('.dpt-dot')].filter(e=>e.dataset.dptKey===key).length,emptyKey),0);
  await emptyRow.locator('span').evaluate(el=>{el.textContent='Synthetic text arrives later.'});
  await page.waitForFunction(key=>[...document.querySelectorAll('.dpt-dot')].some(e=>e.dataset.dptKey===key),emptyKey,{timeout:5000});
  await emptyRow.evaluate(el=>el.remove());await frames(page);
  results.checks.push({name:'synthetic empty reasoning row gains its matching dot',pass:true});
  // Change the rendered host state attributes without running a model or tool.
  const stateCall=page.locator('[data-step-process-content] [data-chat-call-id]').nth(2);
  await stateCall.scrollIntoViewIfNeeded();await frames(page);
  const callState=stateCall.locator('[data-state]').first();
  const originalState=await callState.getAttribute('data-state');
  assert.ok(originalState);
  if(filteredReasoning)assert.equal(originalState,'ok','rc.5 fixture exposes successful tool state');
  const callKey=await stateCall.evaluate(el=>el.closest('[data-chat-flow-kind]').dataset.chatAnchorKey);
  assert.ok(callKey);
  // Completed host calls should grow leaves in the default classic style.
  if(originalState==='ok'){
   await page.waitForFunction(key=>[...document.querySelectorAll('[data-step-process-content] .dpt-leaf')].some(e=>e.dataset.dptLeafKey===key&&getComputedStyle(e).display!=='none'),callKey,{timeout:5000});
   results.checks.push({name:'completed host tool displays classic leaf',pass:true});
  }
  try{
   for(const [state,selector] of [['running','.dpt-running'],['error','.dpt-error'],['stopped','.dpt-stopped']]){
    await callState.evaluate((el,value)=>el.setAttribute('data-state',value),state);
    try{
     await page.waitForFunction(({key,stateClass})=>[...document.querySelectorAll('[data-step-process-content] .dpt-dot')].some(e=>e.dataset.dptKey===key&&e.classList.contains(stateClass)),{key:callKey,stateClass:selector.slice(1)},{timeout:5000});
     await page.waitForFunction(key=>![...document.querySelectorAll('[data-step-process-content] .dpt-leaf')].some(e=>e.dataset.dptLeafKey===key&&getComputedStyle(e).display!=='none'),callKey,{timeout:5000});
    }
    catch(error){
     results.stateDiagnostic=await page.evaluate(()=>({
      states:[...document.querySelectorAll('[data-step-process-content] [data-chat-call-id] [data-state]')].map(e=>({state:e.getAttribute('data-state'),call:e.closest('[data-chat-call-id]')?.dataset.chatCallId,row:e.closest('[data-chat-flow-kind]')?.dataset.chatAnchorKey,top:e.getBoundingClientRect().top})),
      dots:[...document.querySelectorAll('[data-step-process-content] .dpt-dot')].map(e=>({key:e.getAttribute('data-dpt-key'),class:e.getAttribute('class'),visible:e.checkVisibility(),top:e.getBoundingClientRect().top})),
      leaves:[...document.querySelectorAll('[data-step-process-content] .dpt-leaf')].map(e=>({key:e.dataset.dptLeafKey,display:e.style.display,computed:getComputedStyle(e).display,visible:e.checkVisibility()})),
     }));throw error
    }
   }
  }finally{await callState.evaluate((el,value)=>el.setAttribute('data-state',value),originalState)}
  await page.waitForFunction(()=>!document.querySelector('[data-step-process-content] .dpt-dot.dpt-running, [data-step-process-content] .dpt-dot.dpt-error, [data-step-process-content] .dpt-dot.dpt-stopped'));
  if(originalState==='ok')await page.waitForFunction(key=>[...document.querySelectorAll('[data-step-process-content] .dpt-leaf')].some(e=>e.dataset.dptLeafKey===key&&getComputedStyle(e).display!=='none'),callKey,{timeout:5000});
  results.checks.push({name:'host DOM state transitions running error stopped and restore',pass:true});
  await page.locator('[data-chat-call-id]').last().scrollIntoViewIfNeeded();await frames(page);
  results.checks.push({name:'native scrolling viewport',pass:true,...await aligned(page)});
  await activity.click();
  await page.waitForFunction(()=>document.querySelector('[data-process-activity]')?.getAttribute('aria-expanded')==='false');
  await activity.click();
  await page.waitForFunction(()=>document.querySelector('[data-process-activity]')?.getAttribute('aria-expanded')==='true');
  await frames(page);results.checks.push({name:'native process fold and restore',pass:true,...await aligned(page)});
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();
  await page.getByText('过程树',{exact:true}).click();
  for(const [style,label] of [['botanical','植物手稿'],['classic','经典曲线'],['quiet','安静线条']]){
   await page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:new RegExp(label)}).click();await frames(page);
   const crowns=await page.locator('.dpt-crown-portal').count();
   assert.equal(crowns,style==='botanical'?1:0);
   results.checks.push({name:`settings style ${style}`,pass:true,crowns});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await frames(page);
  assert.equal(await page.locator('.dpt-layer[data-state-motion="on"]').count(),0);
  results.checks.push({name:'reduced motion',pass:true});
  await page.getByRole('button',{name:/^(关闭|Close)$/}).click();await frames(page);
  results.checks.push({name:'chat remains aligned after settings',pass:true,...await aligned(page)});
  await page.emulateMedia({colorScheme:'dark'});await frames(page);
  assert.ok(await page.evaluate(()=>document.body.hasAttribute('data-ds-dark-theme')));
  results.checks.push({name:'dark theme',pass:true,...await aligned(page)});
  await page.emulateMedia({colorScheme:'light'});await frames(page);
  assert.ok(await page.evaluate(()=>!document.body.hasAttribute('data-ds-dark-theme')));
  results.checks.push({name:'light theme',pass:true,...await aligned(page)});
  const overlayWrites=await page.evaluate(async()=>{
   let count=0;const observer=new MutationObserver(records=>{count+=records.length});
   observer.observe(document.querySelector('[data-step-process-content] .dpt-layer'),{attributes:true,childList:true,subtree:true});
   for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);observer.disconnect();return count;
  });
  assert.equal(overlayWrites,0,'settled overlay keeps rewriting');
  results.checks.push({name:'settled overlay writes',pass:true,writes:overlayWrites});
  if(process.env.DSH_TEST_PROFILE_PATCH){
   const file=process.env.DSH_TEST_PROFILE_PATCH,original=fs.readFileSync(file,'utf8');
   const disabled=original+'\n- id: dsh-process-tree\n  disabled: true\n';
   try{
    fs.writeFileSync(file,disabled);
    await page.waitForFunction(()=>!document.querySelector('style[data-plugin="dsh-process-tree"]')&&!document.querySelector('.dpt-layer')&&!document.querySelector('.dpt-crown-portal'));
    assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--dsh-tool-indent')),'');
    results.checks.push({name:'live host disable cleans DOM and root variables',pass:true});
    fs.writeFileSync(file,original);
    await page.waitForSelector('[data-step-process-content] .dpt-dot');await frames(page);
    assert.equal(await page.locator('style[data-plugin="dsh-process-tree"]').count(),1);
    results.checks.push({name:'live host re-enable creates one instance',pass:true,...await aligned(page)});
   }finally{if(fs.readFileSync(file,'utf8')===disabled)fs.writeFileSync(file,original)}
  }else results.lifecycle={tested:false,reason:'DSH_TEST_PROFILE_PATCH was not provided'};
  assert.deepEqual(errors,[]);results.errors=errors;
  fs.writeFileSync(path.join(out,'host-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }catch(error){results.failure=String(error);results.errors=errors;fs.writeFileSync(path.join(out,'host-results.json'),JSON.stringify(results,null,2));throw error}
 finally{await context.close();await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
