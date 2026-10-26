// Run: node --test test/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadClient } from './load-client.mjs'

const api = loadClient()
// VM-realm objects have their own prototypes; compare plain copies.
const pt = (p) => ({ x: p.x, y: p.y })

const LEGACY_BOTANICAL = {
  botanicalStyle: true, canopyEnabled: true, canopyScale: 0.65, lineWidth: 2.8,
  thicknessDecay: 0.6, rootFusion: 0.7, vineAmplitude: 29 / 6, textureStyle: 'ink',
  leafStyle: 'slim', dotSize: 5.6, dotFollowWidth: true, indent: 12, toolDim: 0.8,
}

test('legacy settings without treeStyle migrate to the classic preset', () => {
  // Arrange / Act
  const settings = api.normalize(LEGACY_BOTANICAL)

  // Assert
  assert.equal(settings.treeStyle, 'classic')
  assert.equal(settings.botanicalStyle, false)
  assert.equal(settings.lineWidth, 2.8)
  assert.equal(settings.thicknessDecay, 0.6)
  assert.equal(settings.rootFusion, 0.7)
  assert.equal(settings.vineAmplitude, 29 / 6)
  assert.equal(settings.textureStyle, 'ink')
  assert.equal(settings.leafStyle, 'slim')
  assert.equal(settings.dotFollowWidth, true)
})

test('migration keeps row appearance and canopy preferences', () => {
  const settings = api.normalize(LEGACY_BOTANICAL)

  assert.equal(settings.indent, 12)
  assert.equal(settings.toolDim, 0.8)
  assert.equal(settings.canopyScale, 0.65)
})

test('an explicit botanical style keeps its own values', () => {
  const settings = api.normalize({ ...LEGACY_BOTANICAL, treeStyle: 'botanical' })

  assert.equal(settings.treeStyle, 'botanical')
  assert.equal(settings.botanicalStyle, true)
  assert.equal(settings.lineWidth, 2.8)
  assert.equal(settings.vineAmplitude, 29 / 6)
})

test('an unknown treeStyle falls back to classic', () => {
  assert.equal(api.normalize({ treeStyle: 'neon' }).treeStyle, 'classic')
})

test('normalize does not mutate its input', () => {
  const input = { ...LEGACY_BOTANICAL }
  api.normalize(input)
  assert.deepEqual(input, LEGACY_BOTANICAL)
})

test('fresh defaults are classic and explicit saved styles keep their values', () => {
  for (const raw of [undefined, null, {}, api.DEFAULTS]) {
    const settings = api.normalize(raw)
    assert.equal(settings.treeStyle, 'classic')
    assert.equal(settings.lineWidth, 2.8)
    assert.equal(settings.thicknessDecay, 0.6)
  }
  for (const treeStyle of ['quiet', 'botanical', 'classic']) {
    const settings = api.normalize({ treeStyle, lineWidth: 9, indent: 40 })
    assert.equal(settings.treeStyle, treeStyle)
    assert.equal(settings.lineWidth, 9)
    assert.equal(settings.indent, 40)
  }
})

test('botanical roots are thicker while classic and quiet keep their widths', () => {
  const preset = api.STYLE_PRESETS.botanical
  assert.equal(preset.lineWidth, 5.6)
  assert.equal(api.STYLE_PRESETS.classic.lineWidth, 2.8)
  assert.equal(api.STYLE_PRESETS.quiet.lineWidth, 1.5)
  assert.equal(api.normalize({ treeStyle: 'botanical' }).lineWidth, 5.6)
  assert.equal(preset.thicknessDecay, 0.6)
  assert.equal(preset.rootFusion, 0.7)
  assert.equal(preset.vineAmplitude, 29 / 6)
  assert.equal(preset.textureStyle, 'ink')
  assert.equal(preset.dotFollowWidth, true)
})

test('elbowD goes down, turns once, then runs horizontally into the node', () => {
  // Arrange
  const x0 = 5, y0 = 10, x1 = 40, y1 = 60

  // Act
  const curve = api.elbowCurve(x0, y0, x1, y1)

  // Assert
  const [first, arc, last] = curve.segments
  assert.deepEqual(pt(first[0]), { x: x0, y: y0 })
  assert.ok(first.every((p) => p.x === x0), 'first leg is vertical')
  assert.deepEqual(pt(arc[0]), { x: x0, y: y1 - api.ELBOW_RADIUS })
  assert.deepEqual(pt(arc[3]), { x: x0 + api.ELBOW_RADIUS, y: y1 })
  assert.ok(last.every((p) => p.y === y1), 'last leg is horizontal')
  assert.deepEqual(pt(last[3]), { x: x1, y: y1 })
  assert.match(curve.d, /^M5,10 L5,54 C/)
})

test('elbowD shrinks the corner radius to fit tight rows', () => {
  const curve = api.elbowCurve(0, 0, 20, 3)

  assert.equal(curve.segments.length, 2, 'no vertical leg when the turn uses all the height')
  assert.deepEqual(pt(curve.segments[0][3]), { x: 3, y: 3 })
})

test('elbowD rejects targets that are not below and to the right', () => {
  assert.equal(api.elbowCurve(10, 10, 10, 40).d, '')
  assert.equal(api.elbowCurve(10, 10, 40, 10).d, '')
})

test('quiet dots step down by depth and ignore line width', () => {
  api.setSettings(api.normalize({ treeStyle: 'quiet', lineWidth: 9 }))

  assert.equal(api.dotRadius({ kind: 'tool', depth: 1, width: 9 }), 3)
  assert.equal(api.dotRadius({ kind: 'tool', depth: 2, width: 9 }), 2.5)
  assert.equal(api.dotRadius({ kind: 'tool', depth: 3, width: 9 }), 2)
  assert.equal(api.dotRadius({ kind: 'tool', depth: 6, width: 9 }), 2)
  assert.equal(api.dotRadius({ kind: 'think', depth: 1, width: 9 }), 2.5)
})

test('the quiet rail sits left of the botanical rail', () => {
  api.setSettings(api.normalize({ treeStyle: 'quiet' }))
  const quiet = api.railX()
  api.setSettings(api.normalize({ treeStyle: 'botanical' }))
  const botanical = api.railX()

  assert.equal(botanical, 11)
  assert.ok(quiet < botanical)
})
