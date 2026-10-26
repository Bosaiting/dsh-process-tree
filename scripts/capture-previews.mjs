// Render the real plugin against a synthetic, non-private transcript.
// npm ci && npx playwright install chromium && node scripts/capture-previews.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'docs', 'images')
fs.mkdirSync(output, { recursive: true })
const seam = 'DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX,'
const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
assert.ok(source.includes(seam))
// Expose existing internals in this isolated page only; runtime stays unchanged.
const previewSource = source.replace(seam, seam + ' CSS, createManager, applyLineVars,')
const modes = [
  { id: 'classic', title: 'Classic curves', subtitle: 'Flowing branches, tapered strokes & leaves', label: 'DEFAULT' },
  { id: 'quiet', title: 'Quiet lines', subtitle: 'Uniform strokes, rounded corners & subtle dots', label: 'MINIMAL' },
  { id: 'botanical', title: 'Botanical', subtitle: 'Original canopy, wood roots & organic details', label: 'ILLUSTRATED' },
]
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#f6f5f1;color:#343b39;font:16px/1.5 Arial,sans-serif}
body{padding:28px}#card{width:904px;background:#fffefa;border:1px solid #dfdfd5;border-radius:18px;overflow:hidden}
header{padding:28px 36px 25px;border-bottom:1px solid #e8e7de;display:flex;align-items:center;justify-content:space-between}
h1{margin:0;font-size:26px;font-weight:600;letter-spacing:-.6px}header p{margin:5px 0 0;color:#7b807b;font-size:14px}
.badge{font-size:10px;font-weight:700;letter-spacing:1.4px;border:1px solid #d9ded3;border-radius:6px;padding:6px 9px;color:#6c7766;background:#f1f4eb}
main{padding:28px 50px 36px 128px}.activity{font-size:13px;color:#8a8e85;margin:0 0 23px;display:flex;align-items:center;gap:9px}
.activity:before{content:'⌄';font-size:20px;color:#92988d}.activity span{font-size:11px;margin-left:auto;color:#89917e}
[data-step-process-content]{display:flex;flex-direction:column;gap:19px;color:#5c655d}
[data-subcalls]{display:flex;flex-direction:column}
[data-disclosure-row]{display:flex;align-items:center;gap:10px;white-space:nowrap;font-size:15px}
.kind{color:#8b9286;font-size:12px;min-width:48px}.chevron{color:#969d90;font-size:16px;width:10px}
footer{border-top:1px solid #e8e7de;padding:15px 36px;color:#8a8e83;font-size:11px;display:flex;justify-content:space-between;letter-spacing:.1px}
:root{--dsw-alias-label-secondary:#6d7668;--dsw-alias-label-tertiary:#8b9581;--dsw-alias-border-l2:#dce0d1;--dsw-alias-bg-base:#fffefa;--dsw-alias-label-deep-diving:#668576}
</style></head><body><article id="card"><header><div><h1></h1><p></p></div><div class="badge"></div></header><main>
<section data-step-process data-chat-group-key="readme-preview"><div class="activity">Task process <span>COMPLETED</span></div><div data-step-process-content>
<div data-chat-flow-kind="reasoning" data-chat-anchor-key="plan"><div data-variant="think"><div data-disclosure-row><span class="kind">THINK</span>Plan the implementation</div></div></div>
<div data-chat-flow-kind="tool-call" data-chat-anchor-key="inspect"><div data-chat-call-id="inspect"><div data-state="completed"><div data-disclosure-row><span class="chevron">⌄</span><span class="kind">CODE</span>Inspect the project</div></div><div data-subcalls>
<div data-chat-call-id="read"><div data-state="completed"><div data-disclosure-row><span class="chevron">›</span><span class="kind">SHELL</span>Read source files</div></div></div>
<div data-chat-call-id="check"><div data-state="completed"><div data-disclosure-row><span class="chevron">⌄</span><span class="kind">CODE</span>Validate the changes</div></div><div data-subcalls>
<div data-chat-call-id="unit"><div data-state="completed"><div data-disclosure-row><span class="chevron">›</span><span class="kind">SHELL</span>Run unit tests</div></div></div>
<div data-chat-call-id="browser"><div data-state="completed"><div data-disclosure-row><span class="chevron">›</span><span class="kind">SHELL</span>Check browser compatibility</div></div></div>
</div></div></div></div></div>
<div data-chat-flow-kind="reasoning" data-chat-anchor-key="summary"><div data-variant="think"><div data-disclosure-row><span class="kind">THINK</span>Summarize the results</div></div></div>
</div></section></main><footer><span>dsh-process-tree</span><span>Same sample · 28 px indent · Synthetic preview</span></footer></article></body></html>`

const browser = await chromium.launch({
  headless: true,
  ...(process.env.DSH_CHROMIUM_EXECUTABLE ? { executablePath: process.env.DSH_CHROMIUM_EXECUTABLE } : {}),
})
try {
  for (const mode of modes) {
    const context = await browser.newContext({ viewport: { width: 960, height: 1100 }, deviceScaleFactor: 2 })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(String(error)))
      await page.route('**/*', route => route.request().url() === 'https://dsh-tree-preview.invalid/'
        ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort())
      await page.goto('https://dsh-tree-preview.invalid/', { waitUntil: 'networkidle' })
      await page.evaluate(mode => {
        document.querySelector('h1').textContent = mode.title
        document.querySelector('header p').textContent = mode.subtitle
        document.querySelector('.badge').textContent = mode.label
        window.__ModuleLoader__ = { load(spec) { window.moduleSpec = spec } }
        window[Symbol.for('dsh.process-tree.test')] = api => { window.api = api }
      }, mode)
      await page.addScriptTag({ path: path.join(root, 'node_modules/react/umd/react.development.js') })
      await page.addScriptTag({ content: previewSource })
      await page.evaluate(id => {
        moduleSpec.factory(name => {
          if (name === 'react') return React
          throw new Error('Unexpected module: ' + name)
        })
        api.setSettings(api.normalize({ ...api.DEFAULTS, ...api.STYLE_PRESETS[id], treeStyle: id, indent: 28, growthEnabled: false, stateMotion: false }))
        api.applyLineVars()
        const css = document.createElement('style')
        css.textContent = api.CSS
        document.head.append(css)
        window.manager = api.createManager()
        manager.start()
      }, mode.id)
      await page.evaluate(async () => {
        await document.fonts.ready
        for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame)
      })
      assert.deepEqual(errors, [])
      assert.equal(await page.locator('.dpt-dot').count(), 7)
      assert.equal(await page.locator('.dpt-crown-portal').count(), mode.id === 'botanical' ? 1 : 0)
      await page.locator('#card').screenshot({ path: path.join(output, mode.id + '.png'), animations: 'disabled' })
      await page.evaluate(() => manager.stop())
      console.log('Captured ' + mode.id)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
