// Isolated loopback DSH host with synthetic records only; never use a personal profile.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('playwright')
const root = process.env.DPT_HOST_TEST_ROOT
assert.ok(root && fs.existsSync(path.join(root, '.dpt-disposable-test')), 'marked disposable root required')
assert.ok(process.env.DSH_HOME?.startsWith(root + path.sep), 'isolated DSH_HOME required')
const hostLog = fs.readFileSync(process.env.DSH_TEST_HOST_LOG, 'utf8')
const input = hostLog.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0]
assert.ok(input && new URL(input).hostname === '127.0.0.1', 'loopback host required')
const checks = []
const check = name => { checks.push(name); console.log('PASS', name) }
const frames = page => page.evaluate(async () => { for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame) })
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', error => errors.push(String(error)))
  try {
    await page.goto(input, { waitUntil: 'networkidle' })
    const welcome = page.getByRole('button', { name: /^(继续|Continue)$/ }), close = page.getByRole('button', { name: /^(关闭|Close)$/ })
    if (await welcome.isVisible()) { await welcome.click(); await close.waitFor({ state: 'visible' }) }
    if (await close.isVisible()) await close.click()
    const fixture = page.getByRole('treeitem').filter({ hasText: 'Code Font Fixture' }).first()
    if (!await fixture.isVisible()) await page.getByText(/^(未分组|Ungrouped)$/, { exact: true }).click()
    await fixture.click()
    const activity = page.locator('[data-process-activity]').first()
    if (!await activity.isVisible()) await page.getByRole('button', { name: /已完成，用时|Completed.*\d/ }).first().click()
    if (await activity.getAttribute('aria-expanded') !== 'true') await activity.click()
    await page.waitForSelector('[data-chat-call-id="font-run-code"]')
    await page.getByRole('button', { name: /^(账号菜单|Account menu)$/ }).click()
    await page.getByRole('menuitem', { name: /设置|Settings/ }).click()
    await page.getByText('过程树', { exact: true }).click()
    await page.getByRole('radiogroup', { name: '风格' }).getByRole('radio', { name: /代码块/ }).click()
    await page.getByRole('combobox', { name: '代码形态' }).selectOption('function')
    await page.getByRole('combobox', { name: '展示语言' }).selectOption('javascript')
    await page.getByRole('dialog').getByRole('button', { name: /^(关闭|Close)$/ }).click()
    const call = page.locator('[data-chat-call-id="font-run-code"]')
    const header = call.locator('[data-disclosure-row], [data-sample]').first()
    await header.click(); await frames(page)
    const summary = call.locator('.dpt-code-expression').first()
    const block = call.locator('[data-code-block-content]'), pre = block.locator('pre'), code = pre.locator('code')
    await pre.waitFor({ state: 'visible' })
    const codeText = await code.textContent(), tokenCount = await code.locator('span[style*="color"]').count()
    const tokenColors = () => code.locator('span[style*="color"]').evaluateAll(els => els.map(el => getComputedStyle(el).color))
    assert.ok(tokenCount >= 3, 'native syntax highlighting is present')
    assert.equal(await block.locator('.dpt-code-expression').count(), 0)
    const sizes = async () => ({
      summary: await summary.evaluate(el => getComputedStyle(el).fontSize),
      pre: await pre.evaluate(el => getComputedStyle(el).fontSize),
      code: await code.evaluate(el => getComputedStyle(el).fontSize),
    })
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme }); await frames(page)
      const s = await sizes(); assert.equal(s.pre, s.summary); assert.equal(s.code, s.summary)
    }
    check('expanded highlighted code follows summary size in both themes')
    const content = page.locator('[data-step-process-content]').first()
    await content.evaluate(el => el.style.setProperty('--dsh-content-font-size-secondary', '17px')); await frames(page)
    assert.deepEqual(await sizes(), { summary: '17px', pre: '17px', code: '17px' })
    await content.evaluate(el => el.style.removeProperty('--dsh-content-font-size-secondary')); await frames(page)
    check('code follows a changed summary font size')
    const colorsBefore = await tokenColors()
    const wrap = call.getByRole('button', { name: /^(自动换行|Wrap lines)$/ })
    const copy = call.getByRole('button', { name: /^(复制|Copy)$/ })
    const before = await wrap.getAttribute('aria-pressed')
    await wrap.click(); assert.notEqual(await wrap.getAttribute('aria-pressed'), before)
    await wrap.click(); assert.equal(await wrap.getAttribute('aria-pressed'), before)
    await page.evaluate(() => { window.syntheticClipboard = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.syntheticClipboard = text } } }) })
    await copy.click(); await page.waitForFunction(() => window.syntheticClipboard.includes('synthetic code'))
    assert.equal(await code.textContent(), codeText); assert.equal(await code.locator('span[style*="color"]').count(), tokenCount)
    assert.deepEqual(await tokenColors(), colorsBefore)
    check('native wrapping, copy and syntax highlighting remain functional')
    await page.evaluate(() => {
      const block = document.createElement('div'); block.id = 'outside-code-fixture'
      block.innerHTML = '<div data-code-block-content><pre style="font-size:19px !important"><code>outside process</code></pre></div>'
      document.body.append(block)
    })
    const outside = page.locator('#outside-code-fixture pre')
    const outsideBefore = await outside.evaluate(el => getComputedStyle(el).fontSize)
    assert.notEqual(outsideBefore, (await sizes()).summary, 'outside fixture distinguishes host style')
    await header.click(); await pre.waitFor({ state: 'hidden' })
    await header.click(); await pre.waitFor({ state: 'visible' }); await frames(page)
    assert.equal((await sizes()).pre, (await sizes()).summary)
    assert.equal(await outside.evaluate(el => getComputedStyle(el).fontSize), outsideBefore)
    check('native fold and unrelated code block remain intact')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ checks: checks.length, theme: await page.evaluate(() => document.body.hasAttribute('data-dsh-claude-style')) }))
  } finally { await browser.close() }
})().catch(error => { console.error(String(error.stack).replace(/(token=)[^&\s'\"]+/gi, '$1[redacted]')); process.exitCode = 1 })
