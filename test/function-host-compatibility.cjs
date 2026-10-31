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
  // Seed old-format preferences only in this disposable browser profile.
  await page.addInitScript(()=>{
   if (!sessionStorage.getItem('dpt-legacy-seeded')) {
    localStorage.setItem('dsh.process-tree.v1',JSON.stringify({treeStyle:'classic',codeLightFunction:'#123456',codeDarkFunction:'#abcdef',indent:31}));
    sessionStorage.setItem('dpt-legacy-seeded','1');
   }
  });
  await page.goto(input,{waitUntil:'networkidle'});
  const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}),close=page.getByRole('button',{name:/^(关闭|Close)$/});
  if(await welcome.isVisible()){await welcome.click();await close.waitFor({state:'visible'})}if(await close.isVisible())await close.click();
  const fixture=page.getByRole('treeitem').filter({hasText:'Function Code Fixture'}).first();
  if(!await fixture.isVisible())await page.getByText(/^(未分组|Ungrouped)$/,{exact:true}).click();await fixture.click();
  const activity=page.locator('[data-process-activity]').first();if(!await activity.isVisible())await page.getByRole('button',{name:/已完成，用时|Completed.*\d/}).first().click();
  if(await activity.getAttribute('aria-expanded')!=='true')await activity.click();await page.waitForSelector('[data-step-process-content] [data-chat-call-id]');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  const card=page.getByRole('radiogroup',{name:'风格'}).getByRole('radio',{name:/代码块/});await card.click();await frames(page);
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh.process-tree.v1')));
  assert.equal(migrated.codeLightFunction,'#123456');assert.equal(migrated.codeDarkFunction,'#abcdef');assert.equal(migrated.indent,31);
  assert.equal(migrated.codeLightPreset,'vscode');assert.equal(migrated.codeDarkPreset,'vscode');assert.equal(migrated.codeBackgroundMode,'host');
  check('legacy settings migrate without changing saved colours or spacing');
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
  const lightPreset=page.getByLabel('浅色配色方案'),darkPreset=page.getByLabel('深色配色方案'),codeBackground=page.getByLabel('代码背景');
  await codeBackground.selectOption('theme');
  for(const [id,lightColor,darkColor,lightBg,darkBg] of [
   ['jetbrains','rgb(0, 51, 179)','rgb(215, 134, 60)','rgb(255, 255, 255)','rgb(43, 43, 43)'],
   ['catppuccin','rgb(136, 57, 239)','rgb(203, 166, 247)','rgb(239, 241, 245)','rgb(30, 30, 46)'],
   ['dracula','rgb(163, 20, 77)','rgb(255, 121, 198)','rgb(255, 251, 235)','rgb(40, 42, 54)']]) {
   await lightPreset.selectOption(id);await darkPreset.selectOption(id);
   for(const [mode,color,bg] of [['light',lightColor,lightBg],['dark',darkColor,darkBg]]) {
    await page.getByRole('combobox',{name:'预览主题'}).selectOption(mode);await frames(page);
    assert.equal(await page.locator('.dpt-preview-stage .dpt-function-header [data-token="keyword"]').evaluate(e=>getComputedStyle(e).color),color);
    assert.equal(await page.locator('.dpt-preview-stage [data-step-process-content]').evaluate(e=>getComputedStyle(e).backgroundColor),bg);
   }
  }
  await lightPreset.selectOption('vscode');await darkPreset.selectOption('vscode');await codeBackground.selectOption('host');await frames(page);
  check('IDE presets and optional backgrounds preview in both host themes');
  await page.locator('.dpt-preview-panel').screenshot({path:path.join(out,'function-preview.png')});
  check('function layout and explicit IDE preview themes');
  await close.click();await frames(page);
  const process=page.locator('[data-step-process-content]');
  const waitForTab=suffix=>page.waitForFunction(suffix=>Array.from(document.querySelectorAll('[data-step-process-content] .dpt-function-tab')).some(tab=>tab.textContent.endsWith(suffix)),suffix,{timeout:5000});
  assert.ok((await process.locator('.dpt-function-header').innerText()).startsWith('def '));
  assert.ok((await process.locator('.dpt-function-header').innerText()).includes('workspace='));
  assert.equal(await process.locator('.dpt-code-expression').count(),8);
  check('function header uses real current-session context and eight structured calls');
  const expression=id=>process.locator(`[data-chat-call-id="${id}"] .dpt-code-expression`).first();
  assert.match((await expression('function-call-1').innerText()).replace(/\s+/g,' '), /path="package.json".*offset=10.*limit=40/);
  assert.match(await process.locator('.dpt-function-stats').innerText(), /已加载调用 8 · 已记录失败 2 · 已中断 1/);
  assert.equal(await process.locator('.dpt-code-duration').count(),7);
  assert.equal(await expression('function-call-2').innerText(),'bash(command="npm test", cwd="./demo")');
  assert.match(await expression('function-call-4').innerText(), /^def code\([\s\S]*\):/);
  assert.match(await expression('function-child-2').innerText(), /^def code\([\s\S]*\):/);
  assert.equal(await expression('function-child-1').innerText(),'read(path="src/index.ts")');
  const interrupted=process.locator('[data-chat-call-id="function-call-5"]');
  assert.equal(await interrupted.locator('.dpt-code-status').innerText(),'已中断');
  assert.equal(await interrupted.locator('[data-dpt-function-outcome="stopped"]').count(),1);
  assert.equal(await interrupted.locator('[data-dpt-function-failed],.dpt-code-error,.dpt-code-duration').count(),0);
  assert.match((await expression('function-grandchild').innerText()).replace(/\s+/g,' '), /^write\(\s*path="summary.txt",\s*content="ready"\s*\)$/);
  assert.equal(await process.locator('[data-dpt-function-scope]').count(),2);
  assert.equal(await process.locator('[data-dpt-code-suffix],[data-dpt-code-scope]').count(),0);
  check('actual nested PTC names and arguments retain Python call syntax');
  assert.equal(await process.locator('.dpt-function-crumbs,.dpt-nav-link').count(),0);
  const map=process.locator('.dpt-minimap');assert.ok(await map.locator('.dpt-map-mark').count()>=3);
  await map.locator('.dpt-map-mark').last().click();await frames(page);
  const viewport=process.locator('.dpt-map-viewport');assert.notEqual(await viewport.evaluate(e=>e.style.height),'');
  check('minimap uses loaded host calls without breadcrumbs');

  assert.equal(await process.locator('.dpt-function-readonly').innerText(),'执行记录 · 只读');
  assert.ok((await process.locator('.dpt-function-tab').innerText()).endsWith('.py'));
  const hostScope=process.locator('[data-chat-call-id="function-call-4"] .dpt-scope-toggle').first();
  const hostHeader=process.locator('[data-chat-call-id="function-call-4"] [data-disclosure-row]').first();
  const hostFold=await hostHeader.getAttribute('aria-expanded');
  await hostScope.scrollIntoViewIfNeeded();await hostScope.click();await frames(page);
  assert.equal(await hostHeader.getAttribute('aria-expanded'),hostFold);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'false');
  assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),false);
  await hostScope.focus();await page.keyboard.press('Enter');await frames(page);
  assert.equal(await hostHeader.getAttribute('aria-expanded'),hostFold);
  assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),true);
  check('independent function scope folding preserves native disclosure');
  const childScope=process.locator('[data-chat-call-id="function-child-2"] .dpt-scope-toggle').first();
  await childScope.click();await frames(page);
  assert.equal(await process.locator('[data-chat-call-id="function-child-2"] .dpt-scope-failures').first().innerText(),'含 1 个失败');
  await hostScope.click();await frames(page);
  assert.equal(await process.locator('[data-chat-call-id="function-call-4"] .dpt-scope-failures').first().innerText(),'含 1 个失败');
  assert.equal(await hostHeader.getAttribute('aria-expanded'),hostFold);
  await process.locator('.dpt-failure-count').click();await frames(page);
  const failureList=process.locator('.dpt-failure-list');assert.equal(await failureList.isVisible(),true);
  assert.equal(await failureList.locator('.dpt-failure-item').count(),2);
  await failureList.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');
  assert.equal(await childScope.getAttribute('aria-expanded'),'true');
  assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  assert.equal(await hostHeader.getAttribute('aria-expanded'),hostFold);
  assert.equal(await process.locator('[data-chat-call-id="function-grandchild"] [data-dpt-function-failed]').count(),1);
  await process.locator('.dpt-failure-count').click();await frames(page);
  check('failure list unfolds nested scopes and locates recorded child without opening native results');

  const failure=process.locator('[data-chat-call-id="function-call-2"] .dpt-code-error');
  assert.equal(await failure.count(),1);
  assert.ok((await failure.innerText()).includes('Synthetic output 2.'));
  await failure.click();await frames(page);
  const failureHeader=process.locator('[data-chat-call-id="function-call-2"] [data-disclosure-row], [data-chat-call-id="function-call-2"] [data-sample]').first();
  assert.equal(await failureHeader.getAttribute('aria-expanded'),'true');
  await failureHeader.click({position:{x:5,y:10}});await frames(page);
  check('recorded failure summary opens native result');

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
  assert.equal(await process.locator('[data-chat-call-id="function-call-2"] .dpt-code-status').innerText(),'失败');
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
  for(const width of [520,1440]){await page.setViewportSize({width,height:1000});await frames(page);assert.equal(await process.locator('.dpt-code-expression').count(),8);if(width===520){await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');await more.click()}}
  await page.evaluate(()=>document.body.style.zoom='.8');await frames(page);assert.equal(await process.locator('.dpt-code-expression').count(),8);await page.evaluate(()=>document.body.style.zoom='');await frames(page);
  check('narrow layout and host zoom preserve function rows');
  const writes=await page.evaluate(async()=>{let n=0;const observer=new MutationObserver(r=>n+=r.length);observer.observe(document.querySelector('[data-step-process-content]'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<24;i++)await new Promise(requestAnimationFrame);observer.disconnect();return n});assert.equal(writes,0);
  check('settled function view has no repeated DOM writes',{writes});
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  await page.getByRole('combobox',{name:'展示语言'}).selectOption('javascript');await frames(page);
  assert.match(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),/^function /);
  await close.click();await frames(page);
  await waitForTab('.js');assert.match(await process.locator('.dpt-function-tab').innerText(),/\.js$/);
  assert.match(await expression('function-child-1').innerText(),/^read\(\{path: "src\/index.ts"\}\);/);
  assert.equal(await process.locator('.dpt-function-footer').innerText(),'}');
  assert.match(await process.locator('[data-dpt-function-comment-label]').first().evaluate(e=>getComputedStyle(e,'::before').content),/^"\/\/ /);
  await process.screenshot({path:path.join(out,'javascript-host.png')});
  await hostScope.click();await frames(page);assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),false);
  await process.locator('.dpt-failure-count').click();await frames(page);
  await process.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),2);
  check('JavaScript language renders nested recorded calls, comments, folding, failure navigation and native file actions');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  await page.getByRole('combobox',{name:'展示语言'}).selectOption('c');await frames(page);
  assert.match(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),/^void task_01\(void\) \{/);
  await page.getByRole('dialog').getByRole('button',{name:/^(关闭|Close)$/}).click();await frames(page);
  await waitForTab('.c');assert.match(await process.locator('.dpt-function-tab').innerText(),/\.c$/);
  assert.match(await expression('function-child-1').innerText(),/^read\(\s*\/\* path \*\/ "src\/index.ts"\s*\);$/);
  assert.equal(await process.locator('.dpt-function-footer').innerText(),'}');
  assert.match(await process.locator('[data-dpt-function-comment-label]').first().evaluate(e=>getComputedStyle(e,'::before').content),/^"\/\/ /);
  await hostScope.click();await frames(page);assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),false);
  if (!await process.locator('.dpt-failure-list').isVisible()) await process.locator('.dpt-failure-count').click();await frames(page);
  await process.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),3);
  await process.screenshot({path:path.join(out,'c-host.png')});
  check('C language renders recorded calls, comments, folding, failure navigation and native file actions');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  await page.getByRole('combobox',{name:'展示语言'}).selectOption('cpp');await frames(page);
  assert.match(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),/^void task_01\(\) \{/);
  await page.getByRole('dialog').getByRole('button',{name:/^(关闭|Close)$/}).click();await frames(page);
  await waitForTab('.cpp');assert.match(await process.locator('.dpt-function-tab').innerText(),/\.cpp$/);
  assert.match(await expression('function-child-1').innerText(),/^read\(\s*\/\* path \*\/ "src\/index.ts"\s*\);$/);
  assert.equal(await process.locator('.dpt-function-footer').innerText(),'}');
  assert.match(await process.locator('[data-dpt-function-comment-label]').first().evaluate(e=>getComputedStyle(e,'::before').content),/^"\/\/ /);
  await hostScope.click();await frames(page);assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),false);
  if (!await process.locator('.dpt-failure-list').isVisible()) await process.locator('.dpt-failure-count').click();await frames(page);
  await process.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),4);
  await process.screenshot({path:path.join(out,'cpp-host.png')});
  check('C++ language renders recorded calls, comments, folding, failure navigation and native file actions');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  await page.getByRole('combobox',{name:'展示语言'}).selectOption('java');await frames(page);
  assert.match(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),/^void 检查项目\(\) \{/);
  assert.equal(await page.locator('.dpt-preview-stage .dpt-function-readonly').innerText(),'执行记录 · Java 风格');
  await page.getByRole('dialog').getByRole('button',{name:/^(关闭|Close)$/}).click();await frames(page);
  await waitForTab('.java');assert.match(await process.locator('.dpt-function-tab').innerText(),/\.java$/);
  assert.match(await expression('function-child-1').innerText(),/^read\(\s*"src\/index.ts"\s*\);/);
  const javaChild=process.locator('[data-chat-call-id="function-child-1"]')
  await javaChild.locator('.dpt-code-more').click()
  assert.deepEqual(JSON.parse(await javaChild.locator('.dpt-code-arguments').innerText()),{path:'src/index.ts'})
  await javaChild.locator('.dpt-code-more').click()
  assert.equal(await process.locator('.dpt-function-readonly').innerText(),'执行记录 · Java 风格');
  assert.match(await process.locator('.dpt-function-readonly').getAttribute('title'),/参数按记录顺序展示/);
  assert.equal(await process.locator('.dpt-function-footer').innerText(),'}');
  assert.match(await process.locator('[data-dpt-function-comment-label]').first().evaluate(e=>getComputedStyle(e,'::before').content),/^"\/\/ /);
  await hostScope.click();await frames(page);assert.equal(await process.locator('[data-chat-call-id="function-child-1"]').isVisible(),false);
  if (!await process.locator('.dpt-failure-list').isVisible()) await process.locator('.dpt-failure-count').click();await frames(page);
  await process.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),5);
  await process.screenshot({path:path.join(out,'java-host.png')});
  check('Java positional view preserves raw named arguments, nesting, failure navigation and native file actions');
  await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click();await page.getByRole('menuitem',{name:/设置|Settings/}).click();await page.getByText('过程树',{exact:true}).click();
  await page.getByRole('combobox',{name:'展示语言'}).selectOption('go');await frames(page);
  assert.match(await page.locator('.dpt-preview-stage .dpt-function-header').innerText(),/^func 检查项目\(\) \{/);
  assert.equal(await page.locator('.dpt-preview-stage .dpt-function-readonly').innerText(),'执行记录 · Go 风格');
  await page.getByRole('dialog').getByRole('button',{name:/^(关闭|Close)$/}).click();await frames(page);
  await waitForTab('.go');assert.match(await process.locator('.dpt-function-tab').innerText(),/\.go$/);
  assert.match(await expression('function-child-1').innerText(),/^read\(\s*"src\/index.ts"\s*\)/);
  const goChild=process.locator('[data-chat-call-id="function-child-1"]');
  await goChild.locator('.dpt-code-more').click();assert.deepEqual(JSON.parse(await goChild.locator('.dpt-code-arguments').innerText()),{path:'src/index.ts'});await goChild.locator('.dpt-code-more').click();
  assert.match(await process.locator('[data-dpt-function-brace-scope]').first().evaluate(e=>getComputedStyle(e,'::before').content),/子调用（记录层级）/);
  assert.match(await process.locator('[data-dpt-function-comment-label]').first().evaluate(e=>getComputedStyle(e,'::before').content),/^"\/\/ /);
  await hostScope.click();await frames(page);assert.equal(await goChild.isVisible(),false);
  if (!await process.locator('.dpt-failure-list').isVisible()) await process.locator('.dpt-failure-count').click();await frames(page);
  await process.locator('.dpt-failure-item').filter({hasText:'Synthetic nested failure.'}).click();await frames(page);
  assert.equal(await hostScope.getAttribute('aria-expanded'),'true');assert.equal(await process.locator('[data-chat-call-id="function-grandchild"]').isVisible(),true);
  await first.locator('.dpt-code-link').click();assert.equal(await page.evaluate(()=>window.dptFileClicks),6);
  await process.locator('.dpt-function-header').scrollIntoViewIfNeeded();await frames(page);
  await process.screenshot({path:path.join(out,'go-host.png')});
  check('Go positional view preserves raw arguments, nesting, failure navigation and native file actions');
  console.log('Checking process folding in Go view');
  await activity.click({timeout:10000});await activity.click({timeout:10000});await frames(page);assert.equal(await process.locator('.dpt-function-header').count(),1);assert.equal(await process.locator('.dpt-code-expression').count(),8);
  console.log('Checking persisted language after reload');
  await page.reload({waitUntil:'networkidle',timeout:15000});await frames(page);assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dsh.process-tree.v1'));return [s.codeLayout,s.codeLanguage]}),['function','go']);
  check('native process folding and persisted layout and language survive reload');
  assert.deepEqual(errors,[]);results.errors=errors;
 }catch(error){results.failure=error.stack;console.error('Host check failed:',String(error.message).replace(/(token=)[^&\s'\"]+/gi,'$1[redacted]'));throw error}finally{fs.writeFileSync(path.join(out,'function-host-results.json'),JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
