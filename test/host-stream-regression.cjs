// Only a marked disposable loopback host. Never print the host URL/token.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('playwright')
const redact = value => String(value).replace(/(token=)[^&\s'"]+/gi, '$1[redacted]')
const root = path.resolve(process.env.DSH_STREAM_TEST_DIR || '')
const hostLog = path.resolve(process.env.DSH_TEST_HOST_LOG || '')
if (!process.env.DSH_STREAM_TEST_DIR || !process.env.DSH_TEST_HOST_LOG || !fs.existsSync(path.join(root, '.dpt-disposable-test')) || !hostLog.startsWith(root + path.sep)) throw Error('requires a marked disposable test root and host log inside it')
const input = fs.readFileSync(hostLog, 'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0]
if (!input || new URL(input).hostname !== '127.0.0.1') throw Error('no isolated loopback host URL')
const waitPhase = async n => {
  fs.writeFileSync(path.join(root, `request-${n}`), 'go')
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(path.join(root, 'stream-error'))) throw Error(fs.readFileSync(path.join(root, 'stream-error'), 'utf8'))
    if (fs.existsSync(path.join(root, `completed-${n}`))) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw Error(`fixture phase ${n} timed out`)
}
;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.DSH_CHROMIUM_EXECUTABLE ? { executablePath: process.env.DSH_CHROMIUM_EXECUTABLE } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(redact(error)))
  const checks=[]
  try {
    await page.goto(input, { waitUntil: 'networkidle' })
    const welcome=page.getByRole('button',{name:/^(继续|Continue)$/}), close=page.getByRole('button',{name:/^(关闭|Close)$/})
    if(await welcome.isVisible()){ await welcome.click(); await close.waitFor({state:'visible'}) }
    if(await close.isVisible())await close.click()
    const fixture=page.getByRole('treeitem').filter({hasText:'Process Tree Streaming Fixture'}).first()
    await fixture.waitFor({state:'visible',timeout:10000}); await fixture.click()
    await page.getByText('Synthetic fixture ready.').waitFor({state:'visible'})
    await waitPhase(0); await page.waitForTimeout(200); assert.equal(await page.locator('[data-step-process-content] > [data-chat-group-part="reasoning"]').count(),0); checks.push({name:'empty reasoning block produces no host row',pass:true})
    await waitPhase(1)
    const row=page.locator('[data-step-process-content] > [data-chat-group-part="reasoning"]').last()
    await row.waitFor({state:'attached',timeout:5000})
    const anchor=await row.getAttribute('data-chat-anchor-key'); assert.ok(anchor)
    assert.equal((await row.textContent()).trim(),'');assert.equal(await row.locator('[data-variant="think"]').count(),0)
    checks.push({name:'signature-only row remains empty and filtered',pass:true})
    await waitPhase(2)
    await row.locator('[data-variant="think"]').waitFor({state:'attached'})
    await page.waitForFunction(key=>[...document.querySelectorAll('[data-step-process-content] .dpt-dot')].some(e=>e.dataset.dptKey===key),anchor,{timeout:5000})
    assert.equal(await row.getAttribute('data-chat-anchor-key'),anchor)
    checks.push({name:'visible streaming reasoning has its own matching dot',pass:true})
    await waitPhase(3)
    await page.waitForFunction(key=>[...document.querySelectorAll('[data-step-process-content] .dpt-dot')].filter(e=>e.dataset.dptKey===key).length===1,anchor,{timeout:5000})
    assert.equal(await row.getAttribute('data-chat-anchor-key'),anchor)
    checks.push({name:'subsequent reasoning delta preserves exactly one matching dot',pass:true})
    await waitPhase(4)
    await row.locator('[data-variant="think"][data-state="ok"]').waitFor({state:'attached'}); assert.ok((await row.textContent()).includes('Synthetic streaming thought.'))
    checks.push({name:'stream settles as a durable reasoning message',pass:true})
    assert.deepEqual(errors,[])
    fs.writeFileSync(path.join(root,'host-stream-results.json'),JSON.stringify({scope:'rc.5 real Web host with directly dispatched synthetic stream frames; no model requests or native Desktop claim',checks,errors},null,2)+'\n')
    console.log(JSON.stringify({checks,errors}))
  } finally { await context.close(); await browser.close() }
})().catch(error=>{console.error(redact(error.stack)); process.exitCode=1})
