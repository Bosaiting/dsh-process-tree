// Only run against a disposable synthetic compatibility fixture, never a user profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.env.DPT_HOST_TEST_ROOT;
assert.ok(root&&fs.existsSync(path.join(root,'.dpt-disposable-test')),'marked disposable root required');
assert.ok(process.env.DSH_HOME?.startsWith(root+path.sep),'isolated DSH_HOME required');
const log=fs.readFileSync(process.env.DSH_TEST_HOST_LOG,'utf8');
const input=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0];assert.ok(input);
const out=process.env.DSH_TEST_OUTPUT||path.join(root,'code-results');fs.mkdirSync(out,{recursive:true});
const results={scope:'DSH Web, synthetic Session fixture and explicitly injected nested DOM; no model or tool execution; no native Desktop performance claim.',checks:[]};
const frames=p=>p.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame)});
const check=(name,detail={})=>{results.checks.push({name,pass:true,...detail});console.log('PASS',name)};
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
  await page.goto(input,{waitUntil:'networkidle'});
  const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}),close=page.getByRole('button',{name:/^(关闭|Close)$/});
  if(await welcome.isVisible()){await welcome.click();await close.waitFor({state:'visible'})}if(await close.isVisible())await close.click();
  const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Compatibility Fixture'}).first();
  if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();await fixture.click();
  const activity=page.locator('[data-process-activity]').first();if(!await activity.isVisible())await page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first().click();
  if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();await page.waitForSelector('[data-step-process-content] [data-chat-call-id]');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  const card=page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:/代码块/});await card.click();await page.getByRole('combobox',{name:'代码形态'}).selectOption('braces');await frames(page);
  assert.equal(await card.getAttribute('aria-checked'),'true');assert.ok(await page.locator('.dpt-preview-stage [data-dpt-code-suffix]').count()>0);
  for(const [theme,color] of [['dark','rgb(230, 203, 149)'],['light','rgb(4, 49, 250)']]) {
   await page.getByRole('combobox',{name:'预览主题'}).selectOption(theme);await frames(page);
   assert.equal(await page.locator('.dpt-preview-stage [data-dpt-code-suffix]').first().evaluate(e=>getComputedStyle(e,'::after').color),color);
  }
  check('explicit preview themes use the IDE palette independently of the host');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')).treeStyle==='code');
  check('fourth style selectable, previewed and saved');await close.click();await frames(page);
  const copied=await page.locator('[data-step-process-content]').textContent();assert.equal(await page.locator('[data-step-process-content] [data-dpt-code-suffix]').count(),6);
  assert.equal(await page.locator('[data-step-process-content] .dpt-dot,[data-step-process-content] .dpt-edge').count(),0);
  check('native tool summaries retain their text and links', {links:await page.locator('[data-step-process-content] [data-disclosure-row] button').count()});
  // Retain genuine host summary markup; inject nesting only in this disposable DOM.
  await page.evaluate(()=>{
   const calls=[...document.querySelectorAll('[data-step-process-content] [data-chat-call-id]')];
   const clone=(source,key)=>{const el=source.cloneNode(true);el.dataset.chatCallId=key;el.dataset.chatAnchorKey=key;for(const e of el.querySelectorAll('[data-dpt-code-suffix],[data-dpt-code-state]')){e.removeAttribute('data-dpt-code-suffix');e.removeAttribute('data-dpt-code-state')}return el};
   const sub=document.createElement('div');sub.dataset.subcalls='';const child=clone(calls[1],'code-host-child');sub.append(child);calls[0].append(sub);
   const nested=document.createElement('div');nested.dataset.subcalls='';nested.append(clone(calls[2],'code-host-grandchild'));child.append(nested);
  });await frames(page);
  assert.equal(await page.locator('[data-dpt-code-scope]').count(),2);
  const alignment=await page.evaluate(()=>[...document.querySelectorAll('[data-dpt-code-scope]')].map(sub=>{
   const call=sub.closest('[data-chat-call-id]'),title=call.querySelector('[data-dpt-code-suffix]');
   const rect=sub.getBoundingClientRect(),scale=document.querySelector('[data-step-process-content]').getBoundingClientRect().width/document.querySelector('[data-step-process-content]').offsetWidth;
   const x=rect.left+parseFloat(getComputedStyle(sub).paddingLeft)*scale+parseFloat(getComputedStyle(sub,'::after').marginLeft)*scale;
   return {gap:Math.abs(x-title.getBoundingClientRect().left),space:rect.bottom-sub.lastElementChild.getBoundingClientRect().bottom};
  }));for(const a of alignment){assert.ok(a.gap<1);assert.ok(a.space>=22)}check('nested brackets align with native summary labels and reserve closing rows',{alignment});
  const palette=await page.evaluate(()=>{
   const ids=['fixture-call-1','code-host-child','code-host-grandchild'];
   const titles=ids.map(id=>document.querySelector('[data-chat-call-id="'+id+'"] [data-dpt-code-suffix]'));
   return {pairs:titles.map(e=>getComputedStyle(e,'::after').color),fn:getComputedStyle(titles[0]).color,
    file:getComputedStyle(titles[0].querySelector('button,a')).color};
  });
  assert.deepEqual(palette.pairs,['rgb(4, 49, 250)','rgb(49, 147, 49)','rgb(123, 56, 20)']);assert.equal(palette.fn,'rgb(187, 128, 9)');assert.equal(palette.file,'rgb(163, 21, 21)');
  check('native summaries use function and string colours with three stable bracket depths',{palette});
  const header=page.locator('[data-chat-call-id="fixture-call-1"] [data-disclosure-row]').first();await header.scrollIntoViewIfNeeded();await header.hover();assert.equal(await page.locator('[data-dpt-code-match]').count(),2);
  await page.mouse.move(1400,900);check('hover highlights only its matching pair');
  const state=page.locator('[data-chat-call-id="fixture-call-1"] [data-state]').first();
  for(const value of ['running','error','stopped','ok']){await state.evaluate((e,v)=>e.dataset.state=v,value);await frames(page);assert.equal(await header.locator('[data-dpt-code-state]').getAttribute('data-dpt-code-state'),value);assert.equal(await header.locator('[data-dpt-code-suffix]').evaluate(e=>getComputedStyle(e,'::after').color),palette.pairs[0])}check('native DOM status changes preserve bracket-depth colours');
  await page.emulateMedia({reducedMotion:'reduce'});await frames(page);assert.equal(await page.locator('[data-step-process-content]').getAttribute('data-dpt-code-motion'),'off');check('reduced motion respected');
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});await frames(page);await page.locator('[data-step-process-content]').first().screenshot({path:path.join(out,`code-host-${mode}.png`)});await page.locator('[data-chat-call-id="fixture-call-1"]').screenshot({path:path.join(out,`code-scope-${mode}.png`)});}check('light and dark host visuals captured');
  await page.evaluate(()=>{document.body.style.zoom='.8'});await frames(page);assert.equal(await page.locator('[data-dpt-code-scope]').count(),2);await page.evaluate(()=>{document.body.style.zoom=''});await frames(page);check('nested scope survives host zoom');
  // Remove only the injected subtree before checking host fold/reload behaviour.
  await page.locator('[data-chat-call-id="fixture-call-1"] > [data-subcalls]').evaluate(e=>e.remove());await frames(page);
  assert.equal(await page.locator('[data-step-process-content]').textContent(),copied);
  await activity.click();await page.waitForFunction(()=>document.querySelector('[data-process-activity]').getAttribute('aria-expanded')==='false');await activity.click();await page.waitForFunction(()=>document.querySelector('[data-process-activity]').getAttribute('aria-expanded')==='true');await frames(page);
  assert.equal(await page.locator('[data-step-process-content] [data-dpt-code-suffix]').count(),6);check('native process fold restores decorations without changing copied text');
  const writes=await page.evaluate(async()=>{let n=0;const observer=new MutationObserver(r=>n+=r.length);observer.observe(document.querySelector('[data-step-process-content]'),{subtree:true,attributes:true,childList:true});for(let i=0;i<24;i++)await new Promise(requestAnimationFrame);observer.disconnect();return n});assert.equal(writes,0);check('settled code layout has no repeated DOM writes',{writes});
  await page.reload({waitUntil:'networkidle'});await frames(page);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')).treeStyle),'code');check('code preference survives reload');
  assert.deepEqual(errors,[]);results.errors=errors;
 }catch(error){results.failure=error.stack;throw error}finally{fs.writeFileSync(path.join(out,'code-host-results.json'),JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
