// Test-only: generates the exact source instrumentation used in the host phase runs.
const fs = require('node:fs');
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('usage: node instrument-source.cjs source.js instrumented.js');
let source = fs.readFileSync(input, 'utf8');
const oldHook = 'DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX,';
if (!source.includes(oldHook)) throw Error('test hook anchor not found');
source = source.replace(oldHook, 'TreeView, ' + oldHook);
for (const name of ['geometryOf', 'branchBody', 'strokeGeometry']) {
  const pattern = new RegExp('(function ' + name + '\\([^)]*\\) \\{)');
  if (!pattern.test(source)) throw Error('function anchor not found: ' + name);
  source = source.replace(pattern, '$1 window.__dptCount("' + name + '");');
}
fs.writeFileSync(output, source);
