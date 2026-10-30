// Only a marked disposable DSH_HOME with the synthetic function fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.env.DPT_HOST_TEST_ROOT;
assert.ok(root&&fs.existsSync(path.join(root,'.dpt-disposable-test')),'marked disposable root required');
assert.ok(process.env.DSH_HOME?.startsWith(root+path.sep),'isolated DSH_HOME required');
const input=fs.readFileSync(process.env.DSH_TEST_HOST_LOG,'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0];assert.ok(input);
const out=process.env.DSH_TEST_OUTPUT||path.join(root,'function-results');fs.mkdirSync(out,{recursive:true});
const results={scope:'Real DSH Web projection and native DOM, synthetic Session and nested PTC records. No model, tool execution or desktop FPS claim.',checks:[]};
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
  const fixture=page.getByRole('treeitem').filter({hasText:'Function Code Fixture'}).first();
  if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();await fixture.click();
  const activity=page.locator('[data-process-activity]').first();if(!await activity.isVisible())await page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first().click();
  if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();await page.waitForSelector('[data-step-process-content] [data-chat-call-id]');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  const card=page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:/代码块/});await card.click();await frames(page);
  const layout=page.getByRole('combobox',{name:'代码形态'});assert.equal(await layout.inputValue(),'function');
  assert.equal(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),'def 检查项目(workspace="./demo"):');
  for(const [theme,color] of [['dark','rgb(86, 156, 214)'],['light','rgb(0, 0, 255)']]) {
   await page.getByRole('combobox',{name:'预览主题'}).selectOption(theme);await frames(page);
   assert.equal(await page.locator('.dpt-preview-stage .dpt-function-header [data-token="keyword"]').evaluate(e=>getComputedStyle(e).color),color);
  }
  await page.getByText('浅色代码颜色',{exact:true}).click();await page.getByText('深色代码颜色',{exact:true}).click();
  await page.getByLabel('浅色函数和工具颜色值').fill('#2468AC');await page.getByLabel('深色函数和工具颜色值').fill('#AABBCC');
  for(const [theme,color] of [['light','rgb(36, 104, 172)'],['dark','rgb(170, 187, 204)']]) {
   await page.getByRole('combobox',{name:'预览主题'}).selectOption(theme);await frames(page);
   assert.equal(await page.locator('.dpt-preview-stage .dpt-function-header [data-token="function"]').evaluate(e=>getComputedStyle(e).color),color);
  }
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('dsh.process-tree.v1')||'{}');return s.codeLightFunction==='#2468ac'&&s.codeDarkFunction==='#aabbcc'});
  check('code colors save and preview independently in both themes');
  await page.getByRole('button',{name:'恢复浅色代码颜色'}).click();await page.getByRole('button',{name:'恢复深色代码颜色'}).click();await frames(page);
  await page.locator('.dpt-preview-panel').screenshot({path:path.join(out,'function-preview.png')});
  check('function layout and explicit IDE preview themes');
  await close.click();await frames(page);
  const process=page.locator('[data-step-process-content]');
  assert.ok((await process.locator('.dpt-function-header').innerText()).startsWith('def '));
  assert.ok((await process.locator('.dpt-function-header').innerText()).includes('workspace='));
  assert.equal(await process.locator('.dpt-code-expression').count(),7);
  check('function header uses real current-session context and seven structured calls');
  const expression=id=>process.locator(`[data-chat-call-id="${id}"] .dpt-code-expression`).first();
  assert.match((await expression('function-call-1').innerText()).replace(/\s+/g,' '), /path="package.json".*offset=10.*limit=40/);
  assert.match(await process.locator('.dpt-function-stats').innerText(), /已加载调用 7 · 已记录失败 1/);
  assert.equal(await process.locator('.dpt-code-duration').count(),7);
  assert.equal(await expression('function-call-2').innerText(),'bash(command="npm test", cwd="./demo")');
  assert.match(await expression('function-call-4').innerText(), /^def code\(.*\):/);
  assert.match(await expression('function-child-2').innerText(), /^def code\(.*\):/);
  assert.equal(await expression('function-child-1').innerText(),'read(path="src/index.ts")');
  assert.equal(await expression('function-grandchild').innerText(),'write(path="summary.txt", content="ready")');
  assert.equal(await process.locator('[data-dpt-function-scope]').count(),2);
  assert.equal(await process.locator('[data-dpt-code-suffix],[data-dpt-code-scope]').count(),0);
  check('actual nested PTC names and arguments retain Python call syntax');
  const scoped=process.locator('[data-chat-call-id="function-call-4"] [data-disclosure-row]').first();
  await scoped.scrollIntoViewIfNeeded();const scopeBefore=await scoped.getAttribute('aria-expanded');
  await scoped.click({position:{x:5,y:10}});await frames(page);
  assert.notEqual(await scoped.getAttribute('aria-expanded'),scopeBefore);assert.match(await expression('function-call-4').innerText(), /^def code\(/);
  await scoped.click({position:{x:5,y:10}});await frames(page);
  assert.equal(await scoped.getAttribute('aria-expanded'),scopeBefore);
  assert.match(await expression('function-child-2').innerText(), /^def code\(/);
  check('native scoped call folding preserves nested function representation');
  const first=process.locator('[data-chat-call-id="function-call-1"]'), longCall=process.locator('[data-chat-call-id="function-call-3"]'), more=longCall.locator('.dpt-code-more');
  const nativeHeader=first.locator('[data-disclosure-row]');const beforeFold=await nativeHeader.getAttribute('aria-expanded');
  await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');
  assert.ok(JSON.parse(await longCall.locator('.dpt-code-arguments').innerText()).content.length>300);
  assert.equal(await nativeHeader.getAttribute('aria-expanded'),beforeFold);
  await more.focus();await page.keyboard.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'false');
  check('full parameter disclosure works with mouse and keyboard independently of native folding');
  const write=process.locator('[data-chat-call-id="function-call-3"]');await write.locator('.dpt-code-more').click();
  const full=JSON.parse(await write.locator('.dpt-code-arguments').innerText());assert.ok(full.content.length>300);await write.locator('.dpt-code-more').click();
  check('abbreviated long strings expose their exact full recorded value');
  assert.equal(await process.locator('[data-chat-call-id="function-call-2"] .dpt-code-status').innerText(),'错误');
  assert.equal(await expression('function-call-2').locator('[data-token="function"]').evaluate(e=>getComputedStyle(e).color),'rgb(187, 128, 9)');
  assert.ok(await process.locator('[data-dpt-function-comment]').count()>0);
  check('error status is separate from syntax colours and reasoning reads as comments');
  // The new link delegates to the existing native file action. It opens only a
  // synthetic path in this disposable host; the tool itself is never executed.
  const nativeFile=first.locator('[data-dpt-function-label] button:not([data-dpt-owned])');
  assert.equal(await nativeFile.count(),1);
  await nativeFile.evaluate(e=>{window.dptFileClicks=0;e.addEventListener('click',()=>window.dptFileClicks++)});
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),1);
  check('code file parameter invokes the retained native file action');
  const collapse=page.locator('[data-rightbar-col] [data-sidebar-right-toggle]').first();if(await collapse.isVisible()){await collapse.click();await frames(page)}
  await nativeHeader.click({position:{x:5,y:10}});await frames(page);assert.notEqual(await nativeHeader.getAttribute('aria-expanded'),beforeFold);await nativeHeader.click({position:{x:5,y:10}});await frames(page);
  check('native tool result disclosure remains operational');
  for(const theme of ['light','dark']){await page.emulateMedia({colorScheme:theme});await frames(page);await process.screenshot({path:path.join(out,`function-host-${theme}.png`)});}
  check('light and dark host visuals captured');
  for(const width of [520,1440]){await page.setViewportSize({width,height:1000});await frames(page);assert.equal(await process.locator('.dpt-code-expression').count(),7);if(width===520){await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');await more.click()}}
  await page.evaluate(()=>document.body.style.zoom='.8');await frames(page);assert.equal(await process.locator('.dpt-code-expression').count(),7);await page.evaluate(()=>document.body.style.zoom='');await frames(page);
  check('narrow layout and host zoom preserve function rows');
  const writes=await page.evaluate(async()=>{let n=0;const observer=new MutationObserver(r=>n+=r.length);observer.observe(document.querySelector('[data-step-process-content]'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<24;i++)await new Promise(requestAnimationFrame);observer.disconnect();return n});assert.equal(writes,0);
  check('settled function view has no repeated DOM writes',{writes});
  await activity.click();await activity.click();await frames(page);assert.equal(await process.locator('.dpt-function-header').count(),1);assert.equal(await process.locator('.dpt-code-expression').count(),7);
  await page.reload({waitUntil:'networkidle'});await frames(page);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')).codeLayout),'function');
  check('native process folding and persisted layout survive reload');
  assert.deepEqual(errors,[]);results.errors=errors;
 }catch(error){results.failure=error.stack;fs.writeFileSync(path.join(out,'native-rows.json'),JSON.stringify(await page.locator('[data-disclosure-row]').evaluateAll(rows=>rows.slice(0,8).map(e=>({html:e.outerHTML,style:getComputedStyle(e).cssText,scroll:e.scrollLeft}))),null,2));await page.screenshot({path:path.join(out,'failure.png')});throw error}finally{fs.writeFileSync(path.join(out,'function-host-results.json'),JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
