// A disposable real Web host with session-seed.mjs and DSH_TEST_FIXTURE_STEPS=86.
// No model/tool execution. This tests input displacement, not just render speed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.DSH_PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.DPT_HOST_TEST_ROOT;
const log = process.env.DSH_TEST_HOST_LOG;
if (!root || !log || !fs.existsSync(path.join(root, '.dpt-disposable-test'))) throw Error('Requires a marked disposable test root and host log');
const realRoot = fs.realpathSync(root), realLog = fs.realpathSync(log);
const normalHome = path.join(os.homedir(), '.dsh');
assert.ok(realRoot !== os.homedir() && realRoot !== normalHome && !realRoot.startsWith(normalHome + path.sep));
assert.ok(realLog.startsWith(realRoot + path.sep), 'host log must be inside the disposable root');
const input = fs.readFileSync(realLog, 'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/)?.[0];
assert.ok(input && new URL(input).hostname === '127.0.0.1', 'requires an isolated loopback host');
const redact = value => String(value).replace(/(token=)[^&\s'"<>]+/g, '$1[redacted]');
const frames = page => page.evaluate(async () => { for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame); });
const settings = {
  canopyEnabled: true, soilEnabled: true, growthEnabled: true, stateMotion: true,
  intensity: 'subtle', lineWidth: 3.2, textureStyle: 'ink', leafStyle: 'slim',
  dotStyle: 'ring', dotSize: 4.76, topTransition: 20, subTransition: 21,
  thicknessDecay: .6, rootFusion: .7, indent: 30,
};

async function selectPresentation(page, label) {
  await page.getByRole('button', { name: /^(账号菜单|Account menu)$/ }).click();
  await page.getByRole('menuitem', { name: /设置|Settings/ }).click();
  // The settings row has a text column followed by its selector button.
  const row = page.getByText('Work details', { exact: true }).locator('..').locator('..');
  const selector = row.getByRole('button');
  if ((await selector.innerText()).trim() !== label) {
    await selector.click();
    await page.getByText(label, { exact: true }).last().click();
  }
  const previousTiming = label === 'Detailed' ? 'On next message' : 'On completion';
  const timing = label === 'Detailed' ? 'On completion' : 'On next message';
  if (await page.getByText(previousTiming, { exact: true }).isVisible()) {
    await page.getByText(previousTiming, { exact: true }).click();
    await page.getByText(timing, { exact: true }).click();
  }
  await page.getByRole('button', { name: /^(关闭|Close)$/ }).click();
}

async function runCase(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1.25 });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(redact(error)));
  const result = { ...spec, samples: [], errors };
  try {
    await page.addInitScript(value => localStorage.setItem('dsh.process-tree.v1', JSON.stringify(value)), {
      ...settings, treeStyle: spec.style, botanicalScrollOptimization: spec.legacyOptimization,
    });
    await page.goto(input, { waitUntil: 'networkidle' });
    const welcome = page.getByRole('button', { name: /^(继续|Continue)$/ });
    const close = page.getByRole('button', { name: /^(关闭|Close)$/ });
    if (await welcome.isVisible()) { await welcome.click(); await close.waitFor({ state: 'visible' }); }
    if (await close.isVisible()) await close.click();
    const fixture = page.getByRole('treeitem').filter({ hasText: 'Process Tree Compatibility Fixture' }).first();
    if (!await fixture.isVisible()) await page.getByText(/^(未分组|Ungrouped)$/, { exact: true }).click();
    await fixture.click();
    await selectPresentation(page, spec.presentation);
    const turn = page.getByRole('button', { name: /Completed in/ }).first();
    if (await turn.isVisible() && await turn.isEnabled() && await turn.getAttribute('aria-expanded') !== 'true') await turn.click();
    const activity = page.locator('[data-process-activity]').first();
    if (await activity.isVisible() && await activity.isEnabled() && await activity.getAttribute('aria-expanded') !== 'true') await activity.click();
    await page.waitForSelector('[data-step-process-content]');
    await frames(page);
    result.geometry = await page.evaluate(() => {
      const content = document.querySelector('[data-step-process-content]');
      let target = content.parentElement;
      while (target !== document.body && !(target.scrollHeight > target.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(target).overflowY))) target = target.parentElement;
      if (target === document.body) target = document.scrollingElement;
      window.wheelTarget = target;
      return { processHeight: content.getBoundingClientRect().height, calls: content.querySelectorAll('[data-chat-call-id]').length,
        scrollHeight: target.scrollHeight, clientHeight: target.clientHeight, inner: target.hasAttribute('data-step-process-body'),
        isolated: [...content.children].some(child => !!child.shadowRoot?.querySelector('.dpt-layer')) };
    });
    assert.ok(result.geometry.processHeight > 4000 && result.geometry.calls >= 80, 'requires the long synthetic fixture');
    assert.equal(result.geometry.inner, spec.presentation === 'Detailed');
    assert.equal(result.geometry.isolated, spec.style !== 'code', 'all tree modes isolate drawings regardless of the legacy preference');
    // Setup may position the viewport. No scroll writes are allowed in the
    // measured wheel sequence: per-frame setters would hide native drift.
    await page.evaluate(() => { wheelTarget.scrollTop = wheelTarget.scrollHeight; });
    await frames(page);
    const point = await page.evaluate(() => {
      const box = wheelTarget.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: Math.min(innerHeight - 20, Math.max(20, box.top + box.height / 2)) };
    });
    await page.mouse.move(point.x, point.y);
    await page.evaluate(() => {
      window.wheelWrites = 0;
      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
      Object.defineProperty(Element.prototype, 'scrollTop', { ...descriptor, set(value) { wheelWrites++; descriptor.set.call(this, value); } });
      for (const prototype of [Element.prototype, window]) for (const key of ['scrollTo', 'scrollBy', 'scrollIntoView']) {
        const original = prototype[key];
        if (typeof original === 'function') prototype[key] = function (...args) { wheelWrites++; return original.apply(this, args); };
      }
    });
    for (const delta of [...Array(18).fill(-100), ...Array(18).fill(100)]) {
      const before = await page.evaluate(() => ({ y: wheelTarget.scrollTop, max: wheelTarget.scrollHeight - wheelTarget.clientHeight }));
      await page.mouse.wheel(0, delta);
      // Read only scrollTop while the browser settles; do not force layout or
      // reset position between frames. Also retain late post-input movement.
      const positions = await page.evaluate(() => new Promise(resolve => {
        const values = []; const start = performance.now();
        function tick() { values.push(wheelTarget.scrollTop); if (performance.now() - start < 400) requestAnimationFrame(tick); else resolve(values); }
        requestAnimationFrame(tick);
      }));
      const expected = Math.max(0, Math.min(before.max, before.y + delta));
      const actual = positions.at(-1), error = actual - expected;
      result.samples.push({ delta, before: before.y, expected, actual, error, positions });
    }
    result.after = await page.evaluate(() => ({ scrollHeight: wheelTarget.scrollHeight, writes: wheelWrites,
      transcriptAnchor: getComputedStyle(document.querySelector('[data-step-process-content]')).overflowAnchor }));
    assert.equal(result.after.scrollHeight, result.geometry.scrollHeight, 'content height changed during wheel input');
    assert.equal(result.after.writes, 0, 'the measured sequence must not be driven by script scrolling');
    assert.equal(result.after.transcriptAnchor, 'auto', 'do not disable anchoring on real transcript content');
    assert.deepEqual(errors, []);
    assert.deepEqual(result.samples.filter(sample => Math.abs(sample.error) > 1), [], 'wheel input drifted beyond a one-pixel rounding tolerance');
    result.pass = true;
  } catch (error) { result.pass = false; result.failure = redact(error.stack); }
  finally { await context.close(); }
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.DSH_CHROMIUM_EXECUTABLE ? { executablePath: process.env.DSH_CHROMIUM_EXECUTABLE } : {}) });
  const report = { scope: 'Real isolated DSH Web; synthetic Session records; native wheel input. No model, tool, or Windows Desktop validation.',
    platform: process.platform + '/' + process.arch, chromium: browser.version(), cases: [] };
  const cases = [
    { style: 'botanical', legacyOptimization: false, presentation: 'Verbose' },
    { style: 'botanical', legacyOptimization: true, presentation: 'Verbose' },
    { style: 'classic', legacyOptimization: false, presentation: 'Verbose' },
    { style: 'quiet', legacyOptimization: false, presentation: 'Verbose' },
    { style: 'code', legacyOptimization: false, presentation: 'Verbose' },
    { style: 'botanical', legacyOptimization: false, presentation: 'Detailed' },
  ];
  try {
    for (const spec of cases) {
      if (process.env.DSH_TEST_FILTER && !`${spec.style}-${spec.legacyOptimization}-${spec.presentation}`.includes(process.env.DSH_TEST_FILTER)) continue;
      const result = await runCase(browser, spec); report.cases.push(result);
      console.log(JSON.stringify({ ...spec, pass: result.pass, samples: result.samples.length,
        maxError: Math.max(0, ...result.samples.map(x => Math.abs(x.error))), failure: result.pass ? undefined : result.failure?.split('\n')[0] }));
    }
  } finally { await browser.close(); fs.writeFileSync(path.join(realRoot, process.env.DSH_WHEEL_RESULT_NAME || 'scroll-wheel-results.json'), JSON.stringify(report, null, 2) + '\n'); }
  if (!report.cases.length || report.cases.some(result => !result.pass)) process.exitCode = 1;
})().catch(error => { console.error(redact(error)); process.exitCode = 1; });
