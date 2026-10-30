import test from 'node:test'
import assert from 'node:assert/strict'
import { loadClient } from './load-client.mjs'

const api = loadClient()
const text = syntax => syntax.tokens.map(item => item.value).join('')

test('function layout defaults without changing saved visual preferences', () => {
  const before = api.normalize({ treeStyle: 'code', indent: 42, leading: -3, toolDim: .7 })
  assert.equal(before.codeLayout, 'function')
  assert.equal(before.indent, 42)
  assert.equal(before.leading, -3)
  assert.equal(before.toolDim, .7)
  assert.equal(api.normalize({ ...before, codeLayout: 'braces' }).codeLayout, 'braces')
})

test('function names use short recorded titles or stable numbered fallback', () => {
  assert.equal(api.codeFunctionName('检查项目', 2), '检查项目')
  assert.equal(api.codeFunctionName('Inspect project', 2), 'Inspect_project')
  assert.equal(api.codeFunctionName('def', 2), 'task_02')
  assert.equal(api.codeFunctionName('9 invalid', 3), 'task_03')
  assert.equal(api.codeFunctionName('x'.repeat(70), 4), 'task_04')
})

test('real settled and running calls retain exact names and arguments', () => {
  const head = { name: 'read', argsRaw: '{"path":"src/index.ts","offset":20}' }
  const settled = api.codeCall({ kind: 'result', call: head })
  assert.equal(text(api.codeExpression(settled)), 'read(path="src/index.ts", offset=20)')
  assert.equal(text(api.codeExpression(api.codeCall({ phase: 'start', ...head }))), 'read(path="src/index.ts", offset=20)')
  assert.equal(api.codeCall({ kind: 'result', call: null }), null)
})

test('incomplete arguments remain explicitly unknown until parseable', () => {
  const block = { name: 'read', argsRaw: '{"path":"src/' }
  assert.equal(text(api.codeExpression(api.codeCall(block))), 'read(…)')
  block.argsRaw = '{"path":"src/main.py"}'
  assert.equal(text(api.codeExpression(api.codeCall(block))), 'read(path="src/main.py")')
  assert.equal(text(api.codeExpression(api.codeCall({ name: 'bash', argsRaw: '[]' }))), 'bash(…)')
})

test('Python values and non-identifier keys remain truthful', () => {
  const call = api.codeCall({ name: 'mcp.tool-name', argsRaw: '{"dry-run":true,"value":null}' })
  assert.equal(text(api.codeExpression(call)), 'tools["mcp.tool-name"](**{"dry-run": True}, value=None)')
  const more = api.codeExpression(api.codeCall({ name: 'read', argsRaw: '{"path":"a","offset":2,"limit":3}' }))
  assert.equal(text(more), 'read(path="a", offset=2, limit=3)')
  assert.equal(more.more, false)
})

test('long and untrusted values are escaped and visibly abbreviated', () => {
  assert.equal(api.codeString('a\n"\u202e'), '"a\\n\\"\\u202e"')
  const value = api.codeValue('<img src=x onerror=alert(1)>'.repeat(4))
  assert.equal(value.clipped, true)
  assert.ok(text(value).endsWith('…"'))
  const nested = api.codeValue({ list: [1, 2, 3, 4] })
  assert.equal(nested.clipped, true)
})


test('multiline arguments retain every parameter and aligned closing bracket', () => {
  const call = api.codeCall({ name: 'read', argsRaw: '{"path":"src/main.py","offset":2,"limit":30}' })
  assert.equal(text(api.codeExpression(call, true)), 'read(\n    path="src/main.py",\n    offset=2,\n    limit=30\n)')
})

test('durations require matched real timestamps and interrupted calls stay separate', () => {
  assert.equal(api.codeDuration({kind:'tool-result', callTime:1000, time:2234}), '1.2 s')
  assert.equal(api.codeDuration({kind:'tool-result', callTime:1000, time:1450}), '450 ms')
  assert.equal(api.codeDuration({kind:'tool-result', callTime:null, time:1450}), '')
  assert.equal(api.codeDuration({kind:'tool-result', callTime:1500, time:1450}), '')
  assert.equal(api.codeDuration({kind:'tool-result', callTime:1000, time:1450, error:{code:'interrupted'}}), '')
  const calls = new Map([['a',{kind:'tool-result',isError:true}],['b',{name:'running'}],['c',{kind:'tool-result',isError:true,error:{code:'interrupted'}}]])
  assert.equal(api.codeStats(calls), '已加载调用 3 · 已记录失败 1 · 已中断 1 · 未结束 1')
})


test('scoped tool calls preserve the recorded name and parameters', () => {
  const call = api.codeCall({name:'code',argsRaw:'{"code":"read()","timeout":30}'})
  assert.equal(text(api.codeExpression(call, false, true)), 'def code(code="read()", timeout=30):')
  assert.equal(text(api.codeExpression(call, true, true)), 'def code(\n    code="read()",\n    timeout=30\n):')
  assert.equal(text(api.codeExpression(call, false, true, true)), 'def code(code="read()", timeout=30): …')
  const special = api.codeCall({name:'mcp.tool-name',argsRaw:'{"dry-run":true}'})
  assert.equal(text(api.codeExpression(special, false, true)), 'def tools["mcp.tool-name"](**{"dry-run": True}):')
})
