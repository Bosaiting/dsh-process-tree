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

test('legacy settings without treeStyle migrate to the code preset', () => {
  // Arrange / Act
  const settings = api.normalize(LEGACY_BOTANICAL)

  // Assert
  assert.equal(settings.treeStyle, 'code')
  assert.equal(settings.botanicalStyle, false)
  assert.equal(settings.lineWidth, 1)
  assert.equal(settings.thicknessDecay, 0)
  assert.equal(settings.rootFusion, 0)
  assert.equal(settings.vineAmplitude, 0)
  assert.equal(settings.textureStyle, 'none')
  assert.equal(settings.leafStyle, 'none')
  assert.equal(settings.dotFollowWidth, false)
})

test('migration keeps row appearance; old full-size crowns become the emblem', () => {
  const settings = api.normalize(LEGACY_BOTANICAL)

  assert.equal(settings.indent, 12)
  assert.equal(settings.toolDim, 0.8)
  assert.equal(settings.canopyScale, api.DEFAULTS.canopyScale)
  assert.ok(api.DEFAULTS.canopyScale < 0.45)
})

test('an emblem-sized canopy preference is kept', () => {
  assert.equal(api.normalize({ treeStyle: 'botanical', canopyScale: 0.3 }).canopyScale, 0.3)
  assert.equal(api.normalize({ treeStyle: 'botanical', canopyScale: 0.05 }).canopyScale, 0.15)
})

test('botanical scrolling optimization defaults off and preserves only explicit boolean preferences', () => {
  assert.equal(api.normalize({}).botanicalScrollOptimization, false)
  assert.equal(api.normalize({ treeStyle: 'botanical' }).botanicalScrollOptimization, false)
  assert.equal(api.normalize({ treeStyle: 'botanical', botanicalScrollOptimization: true }).botanicalScrollOptimization, true)
  assert.equal(api.normalize({ treeStyle: 'classic', botanicalScrollOptimization: true }).botanicalScrollOptimization, true)
  assert.equal(api.normalize({ treeStyle: 'botanical', botanicalScrollOptimization: 'true' }).botanicalScrollOptimization, false)
})

test('an explicit botanical style keeps its own values', () => {
  const settings = api.normalize({ ...LEGACY_BOTANICAL, treeStyle: 'botanical' })

  assert.equal(settings.treeStyle, 'botanical')
  assert.equal(settings.botanicalStyle, true)
  assert.equal(settings.lineWidth, 2.8)
  assert.equal(settings.vineAmplitude, 0)
})

test('a custom vine amplitude survives normalization', () => {
  const settings = api.normalize({ treeStyle: 'classic', vineAmplitude: 3 })

  assert.equal(settings.vineAmplitude, 3)
})

test('an unknown treeStyle falls back to code', () => {
  assert.equal(api.normalize({ treeStyle: 'neon' }).treeStyle, 'code')
})

test('normalize does not mutate its input', () => {
  const input = { ...LEGACY_BOTANICAL }
  api.normalize(input)
  assert.deepEqual(input, LEGACY_BOTANICAL)
})

test('soil defaults on and preserves an explicit saved preference', () => {
  assert.equal(api.normalize({}).soilEnabled, true)
  assert.equal(api.normalize({ treeStyle: 'botanical', soilEnabled: false }).soilEnabled, false)
  assert.equal(api.normalize({ treeStyle: 'botanical', soilEnabled: true }).soilEnabled, true)
})

test('fresh defaults are code and explicit saved styles keep their values', () => {
  for (const raw of [undefined, null, {}, api.DEFAULTS]) {
    const settings = api.normalize(raw)
    assert.equal(settings.treeStyle, 'code')
    assert.equal(settings.lineWidth, 1)
    assert.equal(settings.thicknessDecay, 0)
  }
  for (const treeStyle of ['quiet', 'botanical', 'classic']) {
    const settings = api.normalize({ treeStyle, lineWidth: 9, indent: 40 })
    assert.equal(settings.treeStyle, treeStyle)
    assert.equal(settings.lineWidth, 9)
    assert.equal(settings.indent, 40)
  }
})

test('state colors migrate safely and preserve valid custom values', () => {
  const existing = api.normalize({ treeStyle: 'quiet', indent: 24 })
  assert.equal(existing.runningColorLight, '#7190b1')
  assert.equal(existing.errorColorLight, '#c7766e')
  assert.equal(existing.runningColorDark, '#8ca9cb')
  assert.equal(existing.errorColorDark, '#d59188')
  assert.equal(existing.treeStyle, 'quiet')
  assert.equal(existing.indent, 24)

  const custom = api.normalize({
    runningColorLight: '#123ABC', errorColorLight: '#654321',
    runningColorDark: 'red', errorColorDark: '#12345g',
  })
  assert.equal(custom.runningColorLight, '#123abc')
  assert.equal(custom.errorColorLight, '#654321')
  assert.equal(custom.runningColorDark, '#8ca9cb')
  assert.equal(custom.errorColorDark, '#d59188')
})

test('code palettes preserve valid independent choices and migrate missing or invalid colors', () => {
  const old = api.normalize({ treeStyle: 'code', indent: 24 })
  assert.equal(old.codeLightFunction, '#bb8009')
  assert.equal(old.codeDarkFunction, '#ffc66d')
  assert.equal(old.indent, 24)
  const custom = api.normalize({ codeLightFunction: '#123ABC', codeDarkPair1: '#456DEF', codeLightComment: 'red' })
  assert.equal(custom.codeLightFunction, '#123abc')
  assert.equal(custom.codeDarkPair1, '#456def')
  assert.equal(custom.codeLightComment, '#008000')
  assert.equal(custom.codeDarkFunction, '#ffdb94')
})

test('fresh and reset settings use the selected code defaults', () => {
  for (const source of [{}, api.DEFAULTS, {treeStyle:'code'}]) {
    const settings=api.normalize(source)
    assert.equal(settings.codeLayout,'function')
    assert.equal(settings.codeLanguage,'python')
    assert.equal(settings.codeLightPreset,'vscode')
    assert.equal(settings.codeDarkPreset,'jetbrains')
    assert.equal(settings.codeBackgroundMode,'theme')
    for(const theme of ['light','dark']) {
      const id=theme==='light'?'vscode':'jetbrains'
      for(const [token,value] of Object.entries(api.CODE_PRESETS[id][theme])) {
        if(token==='background') continue
        const key='code'+theme[0].toUpperCase()+theme.slice(1)+token[0].toUpperCase()+token.slice(1)
        assert.equal(settings[key],value,key)
      }
    }
  }
})

test('explicit existing layout, language, palettes and background remain intact', () => {
  const before=api.normalize({treeStyle:'code',codeLayout:'braces',codeLanguage:'go',codeLightPreset:'dracula',
    codeDarkPreset:'vscode',codeBackgroundMode:'host',codeLightFunction:'#123456',codeDarkFunction:'#abcdef'})
  const after=api.normalize(JSON.parse(JSON.stringify(before)))
  for(const key of ['codeLayout','codeLanguage','codeLightPreset','codeDarkPreset','codeBackgroundMode','codeLightFunction','codeDarkFunction'])
    assert.equal(after[key],before[key],key)
})

test('code preset migration preserves existing colours and independent customisations', () => {
  const legacy = { treeStyle:'code', codeLightFunction:'#123456', codeDarkPair1:'#abcdef', indent:24, codeLanguage:'java' }
  let settings = api.normalize(legacy)
  assert.equal(settings.codeLightPreset,'vscode')
  assert.equal(settings.codeDarkPreset,'vscode')
  assert.equal(settings.codeBackgroundMode,'host')
  assert.equal(settings.codePaletteProfiles.light.vscode.function,'#123456')
  assert.equal(settings.codePaletteProfiles.dark.vscode.pair1,'#abcdef')
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'light','catppuccin')})
  assert.equal(settings.codeLightFunction,api.CODE_PRESETS.catppuccin.light.function)
  assert.equal(settings.codeDarkPair1,'#abcdef')
  settings = api.normalize({...settings,codeLightFunction:'#fedcba'})
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'light','dracula')})
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'dark','jetbrains')})
  assert.equal(settings.codeDarkFunction,api.CODE_PRESETS.jetbrains.dark.function)
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'light','catppuccin')})
  assert.equal(settings.codeLightFunction,'#fedcba')
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'light','catppuccin',true)})
  assert.equal(settings.codeLightFunction,api.CODE_PRESETS.catppuccin.light.function)
  settings = api.normalize({...settings,...api.codePresetPatch(settings,'light','vscode'),...api.codePresetPatch(settings,'dark','vscode')})
  assert.equal(settings.codeLightFunction,'#123456')
  assert.equal(settings.codeDarkPair1,'#abcdef')
  assert.equal(settings.indent,24)
  assert.equal(settings.codeLanguage,'java')
  const restored=api.normalize(JSON.parse(JSON.stringify(settings)))
  assert.equal(restored.codeLightFunction,'#123456')
  assert.equal(restored.codePaletteProfiles.light.catppuccin.function,api.CODE_PRESETS.catppuccin.light.function)
})

test('all previous saved settings survive palette migration', () => {
  const previous=api.normalize({treeStyle:'code',codeLayout:'braces',codeLanguage:'cpp',indent:43,leading:-3,
    runningColorLight:'#123456',errorColorDark:'#abcdef',codeLightFunction:'#543210',codeDarkComment:'#765432'})
  for(const key of ['codeLightPreset','codeDarkPreset','codeBackgroundMode','codePaletteProfiles']) delete previous[key]
  const migrated=api.normalize(JSON.parse(JSON.stringify(previous)))
  for(const [key,value] of Object.entries(previous)) assert.deepEqual(migrated[key],value,key)
  assert.equal(migrated.codeLightPreset,'vscode')
  assert.equal(migrated.codeDarkPreset,'vscode')
  assert.equal(migrated.codeBackgroundMode,'host')
  assert.equal(migrated.codePaletteProfiles.light.vscode.function,'#543210')
  assert.equal(migrated.codePaletteProfiles.dark.vscode.comment,'#765432')
})

test('legacy-only settings retain the active colours on re-upgrade', () => {
  let current=api.normalize({})
  current=api.normalize({...current,...api.codePresetPatch(current,'light','catppuccin')})
  current=api.normalize({...current,codeLightFunction:'#123456'})
  // Older clients save the flat colour fields but do not know the new keys.
  const legacy={...current}
  for(const key of ['codeLightPreset','codeDarkPreset','codeBackgroundMode','codePaletteProfiles']) delete legacy[key]
  const upgraded=api.normalize(JSON.parse(JSON.stringify(legacy)))
  assert.equal(upgraded.codeLightPreset,'vscode')
  assert.equal(upgraded.codeLightFunction,'#123456')
  assert.equal(upgraded.codePaletteProfiles.light.vscode.function,'#123456')
  assert.equal(upgraded.codePaletteProfiles.light.catppuccin,undefined)
})

test('code presets validate malformed profiles and retain legacy flat colours', () => {
  const settings=api.normalize({codeLightPreset:'missing',codeDarkPreset:'dracula',codeLightFunction:'#123456',
    codePaletteProfiles:{dark:{dracula:{function:'bad',keyword:'#123ABC'}},light:{__proto__:{function:'#111111'}}},codeBackgroundMode:'bad'})
  assert.equal(settings.codeLightPreset,'vscode')
  assert.equal(settings.codeLightFunction,'#123456')
  assert.equal(settings.codeDarkFunction,api.CODE_PRESETS.dracula.dark.function)
  assert.equal(settings.codeDarkKeyword,'#123abc')
  assert.equal(settings.codeBackgroundMode,'host')
  for(const id of ['vscode','jetbrains','catppuccin','dracula']) for(const theme of ['light','dark']) {
    const preset=api.CODE_PRESETS[id][theme]
    for(const key of ['function','keyword','parameter','string','number','comment','text','pair1','pair2','pair3','background'])
      assert.match(preset[key],/^#[0-9a-f]{6}$/i,id+' '+theme+' '+key)
  }
})

test('new preset colours remain legible on their own background', () => {
  const luminance = color => {
    const channels=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255)
      .map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4)
    return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722
  }
  for(const id of ['jetbrains','catppuccin','dracula']) for(const theme of ['light','dark']) {
    const palette=api.CODE_PRESETS[id][theme], background=luminance(palette.background)
    for(const role of ['function','keyword','parameter','string','number','comment','text','pair1','pair2','pair3']) {
      const foreground=luminance(palette[role]), ratio=(Math.max(background,foreground)+0.05)/(Math.min(background,foreground)+0.05)
      assert.ok(ratio>=4.5,`${id} ${theme} ${role}: ${ratio}`)
    }
  }
})

test('each style keeps its own standard preset width', () => {
  const preset = api.STYLE_PRESETS.botanical
  assert.equal(preset.lineWidth, 4.6)
  assert.equal(api.STYLE_PRESETS.classic.lineWidth, 3.8)
  assert.equal(api.STYLE_PRESETS.quiet.lineWidth, 1.5)
  assert.equal(api.normalize({ treeStyle: 'botanical' }).lineWidth, 4.6)
  assert.equal(preset.thicknessDecay, 0.6)
  assert.equal(preset.rootFusion, 0.7)
  assert.equal(preset.vineAmplitude, 0)
  assert.equal(api.STYLE_PRESETS.classic.vineAmplitude, 0)
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

test('quiet dots keep one size per kind at every depth and ignore line width', () => {
  api.setSettings(api.normalize({ treeStyle: 'quiet', lineWidth: 9 }))

  for (const depth of [1, 2, 3, 6]) assert.equal(api.dotRadius({ kind: 'tool', depth, width: 9 }), 3)
  assert.equal(api.dotRadius({ kind: 'think', depth: 1, width: 9 }), 2.5)
})

test('classic dots keep one size per kind at every depth', () => {
  api.setSettings(api.normalize({ treeStyle: 'classic' }))
  const tool = api.dotRadius({ kind: 'tool', depth: 1, width: 2 })

  for (const depth of [2, 3, 6]) assert.equal(api.dotRadius({ kind: 'tool', depth, width: 2 }), tool)
  assert.ok(api.dotRadius({ kind: 'think', depth: 1, width: 2 }) < tool)
})

test('a top-level tool branch leaves the trunk below the previous dot', () => {
  api.setSettings(api.normalize({ treeStyle: 'classic' }))
  const previous = { y: 100 }
  const node = { y: 140, dotX: 50 }

  // Arrange: rows only 40px apart, so the curve wants more room than exists.
  const startY = api.topBranchStartY(previous, previous.y, node)

  assert.ok(startY > previous.y + 4, 'branch must not start at the previous dot')
  assert.ok(startY < node.y)
})

test('the first top-level branch may start near the root', () => {
  api.setSettings(api.normalize({ treeStyle: 'classic' }))

  const startY = api.topBranchStartY(null, 0, { y: 30, dotX: 50 })
  assert.ok(startY >= 0 && startY < 30)
})

test('the trunk-to-branch transition changes where a branch leaves the trunk', () => {
  const previous = { y: 100 }
  const node = { y: 160, dotX: 50 }
  api.setSettings(api.normalize({ treeStyle: 'classic', topTransition: 4 }))
  const short = api.topBranchStartY(previous, previous.y, node)
  api.setSettings(api.normalize({ treeStyle: 'classic', topTransition: 30 }))
  const long = api.topBranchStartY(previous, previous.y, node)

  assert.ok(long < short, 'a longer transition leaves the trunk earlier')
  assert.ok(long > previous.y + 4, 'but never from the previous dot')
})

test('the quiet rail sits left of the botanical rail', () => {
  api.setSettings(api.normalize({ treeStyle: 'quiet' }))
  const quiet = api.railX()
  api.setSettings(api.normalize({ treeStyle: 'botanical' }))
  const botanical = api.railX()

  assert.equal(botanical, 11)
  assert.ok(quiet < botanical)
})

test('a saved leaf density of 0 migrates to hidden leaves that the select can re-enable', () => {
  const migrated = api.normalize({ treeStyle: 'classic', leafStyle: 'slim', leafDensity: 0 })

  assert.equal(migrated.leafStyle, 'none')
  assert.ok(migrated.leafDensity > 0)
  assert.equal(api.normalize({ ...migrated, leafStyle: 'slim' }).leafStyle, 'slim')
})

test('the untouched old classic preset adopts light forks and no texture', () => {
  const settings = api.normalize({ treeStyle: 'classic', rootFusion: 0.7, textureStyle: 'ink' })

  assert.equal(settings.rootFusion, 0.3)
  assert.equal(settings.textureStyle, 'none')
})

test('custom classic texture and botanical wood keep their values', () => {
  const custom = api.normalize({ treeStyle: 'classic', rootFusion: 0.5, textureStyle: 'ink' })
  const botanical = api.normalize({ treeStyle: 'botanical' })

  assert.equal(custom.rootFusion, 0.5)
  assert.equal(custom.textureStyle, 'ink')
  assert.equal(botanical.rootFusion, 0.7)
  assert.equal(botanical.textureStyle, 'ink')
})

test('classic intensity widths, dot sizes and quiet widths remain unchanged', () => {
  const subtle = api.intensityPatch('classic', 'subtle')
  const vivid = api.intensityPatch('classic', 'vivid')
  const standard = api.intensityPatch('classic', 'standard')

  assert.deepEqual([subtle.lineWidth, standard.lineWidth, vivid.lineWidth], [3.1, 3.8, 4.64])
  assert.deepEqual([subtle.dotSize, standard.dotSize, vivid.dotSize], [4.76, 5.6, 6.72])
  assert.deepEqual(['subtle', 'standard', 'vivid'].map(level => api.intensityPatch('quiet', level).lineWidth), [1.13, 1.5, 1.95])
  assert.equal(standard.lineWidth, api.STYLE_PRESETS.classic.lineWidth)
})

test('each botanical intensity reduces its previous line width by one pixel', () => {
  const levels = ['subtle', 'standard', 'vivid']
  assert.deepEqual(levels.map(level => api.intensityPatch('botanical', level).lineWidth), [3.2, 4.6, 6.28])
  assert.deepEqual(levels.map(level => api.intensityPatch('botanical', level).dotSize), [4.76, 5.6, 6.72])
  assert.equal(api.intensityPatch('botanical', 'standard').lineWidth, api.STYLE_PRESETS.botanical.lineWidth)
})

test('saved classic widths remain unchanged until a new intensity is selected', () => {
  for (const [intensity, width, dotSize] of [['subtle', 2.1, 4.76], ['standard', 2.8, 5.6], ['vivid', 3.64, 6.72]]) {
    const saved = api.normalize({ treeStyle: 'classic', intensity, lineWidth: width, dotSize })
    assert.equal(saved.lineWidth, width)
    assert.equal(api.matchesIntensity(saved), false)
    assert.equal(api.matchesLegacyIntensity(saved), true)
    assert.equal(api.matchesIntensity(api.normalize({ ...saved, ...api.intensityPatch('classic', intensity) })), true)
  }
  const custom = api.normalize({ treeStyle: 'classic', intensity: 'standard', lineWidth: 12, dotSize: 5.6 })
  assert.equal(custom.lineWidth, 12)
  assert.equal(api.matchesLegacyIntensity(custom), false)
})

test('saved botanical widths remain unchanged until a new intensity is selected', () => {
  for (const [intensity, width, dotSize] of [['subtle', 4.2, 4.76], ['standard', 5.6, 5.6], ['vivid', 7.28, 6.72]]) {
    const saved = api.normalize({ treeStyle: 'botanical', intensity, lineWidth: width, dotSize })
    assert.equal(saved.lineWidth, width)
    assert.equal(api.matchesIntensity(saved), false)
    assert.equal(api.matchesLegacyIntensity(saved), true)
    assert.equal(api.matchesIntensity(api.normalize({ ...saved, ...api.intensityPatch('botanical', intensity) })), true)
  }
  const custom = api.normalize({ treeStyle: 'botanical', intensity: 'standard', lineWidth: 12, dotSize: 5.6 })
  assert.equal(custom.lineWidth, 12)
  assert.equal(api.matchesLegacyIntensity(custom), false)
})

test('an advanced line width edit reads as custom intensity', () => {
  const base = api.normalize({ treeStyle: 'quiet', ...api.STYLE_PRESETS.quiet, ...api.intensityPatch('quiet', 'vivid') })

  assert.equal(base.intensity, 'vivid')
  assert.equal(api.matchesIntensity(base), true)
  assert.equal(api.matchesIntensity({ ...base, lineWidth: base.lineWidth + 1 }), false)
})

test('an unknown intensity falls back to standard', () => {
  assert.equal(api.normalize({ treeStyle: 'classic', intensity: 'loud' }).intensity, 'standard')
})


test('code is an explicit fourth style and normalization preserves existing preferences', () => {
  const original = api.normalize({ treeStyle: 'botanical', lineWidth: 6.22, dotSize: 6.72, indent: 33, runningColorDark: '#123456', botanicalScrollOptimization: true })
  const code = api.normalize({ ...original, ...api.STYLE_PRESETS.code, treeStyle: 'code' })
  assert.equal(code.treeStyle, 'code')
  assert.equal(code.botanicalStyle, false)
  assert.equal(code.indent, original.indent)
  assert.equal(code.runningColorDark, original.runningColorDark)
  assert.equal(code.botanicalScrollOptimization, true)
  assert.equal(api.matchesIntensity(api.normalize({ ...code, ...api.intensityPatch('code', 'standard') })), true)
  assert.deepEqual(api.normalize(original), original)
  assert.equal(api.normalize({}).treeStyle, 'code')
})
