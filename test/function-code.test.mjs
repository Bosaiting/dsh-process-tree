import test from 'node:test'
import assert from 'node:assert/strict'
import { loadClient } from './load-client.mjs'

const api = loadClient()
const text = syntax => syntax.tokens.map(item => item.value).join('')

test('function layout defaults without changing saved visual preferences', () => {
  const before = api.normalize({ treeStyle: 'code', indent: 42, leading: -3, toolDim: .7 })
  assert.equal(before.codeLayout, 'function')
  assert.equal(before.codeLanguage, 'python')
  assert.equal(before.indent, 42)
  assert.equal(before.leading, -3)
  assert.equal(before.toolDim, .7)
  assert.equal(api.normalize({ ...before, codeLayout: 'braces' }).codeLayout, 'braces')
  assert.equal(api.normalize({ ...before, codeLanguage: 'javascript' }).codeLanguage, 'javascript')
  assert.equal(api.normalize({ ...before, codeLanguage: 'c' }).codeLanguage, 'c')
  assert.equal(api.normalize({ ...before, codeLanguage: 'cpp' }).codeLanguage, 'cpp')
  assert.equal(api.normalize({ ...before, codeLanguage: 'java' }).codeLanguage, 'java')
  assert.equal(api.normalize({ ...before, codeLanguage: 'go' }).codeLanguage, 'go')
  assert.equal(api.normalize({ ...before, codeLanguage: 'unsupported' }).codeLanguage, 'python')
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
  assert.equal(api.codeDuration({kind:'tool-result', callTime:0, time:119500}), '2 min 0 s')
  const calls = new Map([['a',{kind:'tool-result',isError:true}],['b',{name:'running'}],['c',{kind:'tool-result',isError:true,error:{code:'interrupted'}}]])
  assert.equal(api.codeStats(calls), '已加载调用 3 · 已记录失败 1 · 已中断 1 · 未结束 1')
})

test('lossy JSON is not presented as recorded values and raw positional formats retain spellings', () => {
  for (const raw of ['{"n":9007199254740993}', '{"n":1e400}', '{"x":1,"x":2}', '{"x":{"a":1,"\\u0061":2}}', '{"x":0.1234567890123456789}', '{"x":-0}']) {
    const call = api.codeCall({name:'read',argsRaw:raw})
    assert.equal(call.lossless, false, raw)
    for (const lang of ['python','javascript','c','cpp']) {
      const expression = api.codeExpression(call,false,false,false,lang)
      assert.equal(expression.clipped,true, lang+' '+raw)
      assert.ok(!text(expression).includes('9007199254740992'), lang+' '+raw)
    }
  }
  for (const raw of ['{"n":9007199254740992}', '{"n":1e2}', '{"v":0.1,"a":{"x":1},"b":{"x":2}}', '{"s":"a 1e400 \\\"x\\\""}']) {
    assert.equal(api.codeCall({name:'read',argsRaw:raw}).lossless,true,raw)
  }
  const ordered = api.codeCall({name:'read',argsRaw:'{"n":9007199254740993,"n":2}'})
  assert.equal(text(api.codeExpression(ordered,false,false,false,'go')), 'read(9007199254740993, 2)')
  assert.equal(text(api.codeExpression(ordered,false,false,false,'java')), 'read(9007199254740993, 2);')
})

test('long Python and JavaScript values do not split a surrogate pair', () => {
  const value = 'a'.repeat(50) + '😀' + 'z'.repeat(60)
  for (const lang of ['python','javascript']) {
    const expression = api.codeExpression(api.codeCall({name:'read',argsRaw:JSON.stringify({value})}),false,false,false,lang)
    assert.ok(text(expression).includes('😀…'), lang)
    assert.ok(!text(expression).includes('\\ud83d'), lang)
  }
})

test('host and structured failure counts remain distinct', () => {
  const calls = new Map([['ok',{kind:'tool-result',isError:false}],['fail',{kind:'tool-result',isError:true}]])
  assert.equal(api.codeStats(calls,new Map([['ok','error'],['fail','error']])), '已加载调用 2 · 已记录失败 1 · 宿主标记失败 1')
})


test('scoped tool calls preserve the recorded name and parameters', () => {
  const call = api.codeCall({name:'code',argsRaw:'{"code":"read()","timeout":30}'})
  assert.equal(text(api.codeExpression(call, false, true)), 'def code(code="read()", timeout=30):')
  assert.equal(text(api.codeExpression(call, true, true)), 'def code(\n    code="read()",\n    timeout=30\n):')
  assert.equal(text(api.codeExpression(call, false, true, true)), 'def code(code="read()", timeout=30): …')
  const special = api.codeCall({name:'mcp.tool-name',argsRaw:'{"dry-run":true}'})
  assert.equal(text(api.codeExpression(special, false, true)), 'def tools["mcp.tool-name"](**{"dry-run": True}):')
})

test('JavaScript formatting preserves names, values, escaping and nesting without inventing callbacks', () => {
  const js = (call, multiline = false, scope = false, collapsed = false) => text(api.codeExpression(api.codeCall(call), multiline, scope, collapsed, 'javascript'))
  assert.equal(js({name:'read',argsRaw:'{"path":"src/main.py","offset":20,"enabled":true,"value":null}'}), 'read({path: "src/main.py", offset: 20, enabled: true, value: null});')
  assert.equal(js({name:'mcp.tool-name',argsRaw:'{"dry-run":false,"default":"a\\n\\\"b"}'}), 'tools["mcp.tool-name"]({"dry-run": false, "default": "a\\n\\\"b"});')
  assert.equal(js({name:'read',argsRaw:'{"path":"a","offset":2}'}, true), 'read({\n    path: "a",\n    offset: 2\n});')
  assert.equal(js({name:'code',argsRaw:'{}'}, false, true), 'code({}); {')
  assert.equal(js({name:'code',argsRaw:'{}'}, false, true, true), 'code({}); { … }')
  assert.equal(js({name:'read',argsRaw:'{"path":'}), 'read(…);')
  assert.equal(api.codeFunctionName('function', 2, 'javascript'), 'task_02')
  const clipped = api.codeExpression(api.codeCall({name:'read',argsRaw:JSON.stringify({path:'x'.repeat(90), data:[1,2,3,4]})}), false, false, false, 'javascript')
  assert.equal(clipped.clipped, true)
  assert.equal(clipped.tokens.find(item=>item.key==='path').raw, 'x'.repeat(90))
})

test('C display preserves recorded argument names, JSON values and grouping without guessing types', () => {
  const c = (call, multiline = false, scope = false, collapsed = false) => text(api.codeExpression(api.codeCall(call), multiline, scope, collapsed, 'c'))
  assert.equal(c({name:'read',argsRaw:'{"path":"src/main.c","offset":20,"enabled":true,"value":null}'}), 'read(/* path */ "src/main.c", /* offset */ 20, /* enabled */ true, /* value */ /* null */);')
  assert.equal(c({name:'search',argsRaw:'{"filter":{"active":true},"items":[1,2]}'}), 'search(/* filter: JSON */ {"active": true}, /* items: JSON */ [1, 2]);')
  assert.equal(c({name:'mcp.tool-name',argsRaw:'{"dry-run":false}'}), '/* 工具: "mcp.tool-name" */ (/* "dry-run" */ false);')
  assert.equal(c({name:'code',argsRaw:'{}'}, false, true), 'code(); {')
  assert.equal(c({name:'code',argsRaw:'{}'}, false, true, true), 'code(); { … }')
  assert.equal(c({name:'read',argsRaw:'{"path":'}), 'read(…);')
  assert.equal(c({name:'read',argsRaw:'{"path":"a","offset":2}'}, true), 'read(\n    /* path */ "a",\n    /* offset */ 2\n);')
  assert.equal(api.codeFunctionName('检查项目', 2, 'c'), 'task_02')
  assert.equal(api.codeFunctionName('while', 3, 'c'), 'task_03')
  assert.equal(api.codeFunctionName('inspect', 4, 'c'), 'inspect')
})

test('C strings and comment labels safely represent untrusted text and retain file actions', () => {
  const call = api.codeCall({name:'odd*/name\n',argsRaw:JSON.stringify({'a*/b\n': 'x\0'+'9\n"\\\u202e',path:'a'.repeat(80)})})
  const syntax = api.codeExpression(call, false, false, false, 'c'), out = text(syntax)
  assert.match(out, /odd\\u002a\/name\\n/)
  assert.match(out, /a\\u002a\/b\\n/)
  assert.ok(out.includes('x\\0009\\n\\"\\\\\\u202e'))
  assert.equal(syntax.clipped, true)
  assert.equal(syntax.tokens.find(item=>item.key==='path').raw, 'a'.repeat(80))
  assert.equal((out.match(/\*\//g) || []).length, 3, 'untrusted names do not end comments')
})

test('C++ display respects its keywords and preserves records without inventing types', () => {
  const cpp = (call, multiline = false, scope = false, collapsed = false) => text(api.codeExpression(api.codeCall(call), multiline, scope, collapsed, 'cpp'))
  assert.equal(cpp({name:'read',argsRaw:'{"path":"src/main.cpp","offset":20,"enabled":true,"value":null}'}), 'read(/* path */ "src/main.cpp", /* offset */ 20, /* enabled */ true, /* value */ /* null */);')
  assert.equal(cpp({name:'class',argsRaw:'{"namespace":"x","filter":{"enabled":true}}'}), '/* 工具: "class" */ (/* "namespace" */ "x", /* filter: JSON */ {"enabled": true});')
  assert.equal(cpp({name:'ns::read',argsRaw:'{"path":"a"}'}), '/* 工具: "ns::read" */ (/* path */ "a");')
  assert.equal(cpp({name:'code',argsRaw:'{}'}, false, true, true), 'code(); { … }')
  assert.equal(cpp({name:'read',argsRaw:'{"incomplete":'}), 'read(…);')
  assert.equal(cpp({name:'read',argsRaw:'{"path":"a","offset":2}'}, true), 'read(\n    /* path */ "a",\n    /* offset */ 2\n);')
  for (const name of ['class','namespace','template','co_await','concept','operator']) assert.equal(api.codeFunctionName(name, 2, 'cpp'), 'task_02')
  assert.equal(api.codeFunctionName('检查项目', 3, 'cpp'), 'task_03')
  assert.equal(api.codeFunctionName('inspect', 4, 'cpp'), 'inspect')
  const call=api.codeCall({name:'bad*/name\n',argsRaw:JSON.stringify({'key*/name':'a\0'+'7\n"\\\u202e',path:'x'.repeat(80),items:[1,2,3,4]})})
  const syntax=api.codeExpression(call,false,false,false,'cpp'), out=text(syntax)
  assert.match(out,/bad\\u002a\/name\\n/);assert.match(out,/key\\u002a\/name/)
  assert.ok(out.includes('a\\0007\\n\\"\\\\\\u202e'))
  assert.equal(syntax.clipped,true);assert.equal(syntax.tokens.find(item=>item.key==='path').raw,'x'.repeat(80))
})

test('Java displays positional values in recorded order and falls back when representation is unsafe', () => {
  const java = (call, multiline = false, scope = false, collapsed = false) => text(api.codeExpression(api.codeCall(call), multiline, scope, collapsed, 'java'))
  assert.equal(java({name:'bash',argsRaw:'{"description":"check","command":"ls src","enabled":true,"value":null}'}), 'bash("check", "ls src", true, null);')
  assert.equal(java({name:'read',argsRaw:'{"9":"nine","2":"two","9":"again","n":-0,"x":1e2}'}), 'read("nine", "two", "again", -0, 1e2);')
  for (const block of [{name:'search',argsRaw:'{"filter":{"active":true}}'}, {name:'search',argsRaw:'{"items":[1,2]}'}, {name:'mcp.tool-name',argsRaw:'{"path":"a"}'}, {name:'class',argsRaw:'{}'}, {name:'read',argsRaw:'{"path":'}, {name:'read',argsRaw:'{"x":1e400}'}]) {
    assert.equal(api.codeExpression(api.codeCall(block),false,false,false,'java').fallback,true)
  }
  assert.equal(java({name:'code',argsRaw:'{}'}, false, true, true), 'code(); { … }')
  assert.equal(java({name:'read',argsRaw:'{"path":"a","offset":2}'}, true), 'read(\n    "a",\n    2\n);')
  assert.equal(api.codeFunctionName('class',2,'java'), 'task_02')
  assert.equal(api.codeFunctionName('检查项目',3,'java'), '检查项目')
  assert.equal(api.codeFunctionName('_',4,'java'), 'task_04')
  const call=api.codeCall({name:'read',argsRaw:JSON.stringify({'key\nname':'a\0'+'7\n"\\\u202e',path:'x'.repeat(80)})})
  const syntax=api.codeExpression(call,false,false,false,'java'), out=text(syntax)
  assert.doesNotMatch(out,/key/)
  assert.ok(out.includes('a\\0007\\n\\"\\\\\\u202e'))
  assert.equal(syntax.clipped,true);assert.equal(syntax.tokens.find(item=>item.key==='path').raw,'x'.repeat(80))
  const many=Object.fromEntries(Array.from({length:101},(_,i)=>['arg'+i,i]))
  assert.equal(api.codeExpression(api.codeCall({name:'call',argsRaw:JSON.stringify(many)}),false,false,false,'java').more,true)
})



test('Go positional calls retain raw order and use Go string, keyword and multiline rules', () => {
  const go = (call, multiline = false, scope = false, collapsed = false) => text(api.codeExpression(api.codeCall(call), multiline, scope, collapsed, 'go'))
  assert.equal(go({name:'bash',argsRaw:'{"description":"check","enabled":true,"value":null}'}), 'bash("check", true, nil)')
  assert.equal(go({name:'read',argsRaw:'{"9":"nine","2":"two","9":"again","n":-0,"x":1e2}'}), 'read("nine", "two", "again", -0, 1e2)')
  assert.equal(go({name:'read',argsRaw:'{"path":"a","offset":2}'}, true), 'read(\n    "a",\n    2,\n)')
  assert.equal(go({name:'read',argsRaw:'{}'}, false, true), 'read()')
  assert.equal(go({name:'read',argsRaw:'{}'}, false, true, true), 'read() // 子调用已折叠')
  for (const block of [{name:'search',argsRaw:'{"filter":{"active":true}}'}, {name:'search',argsRaw:'{"items":[1,2]}'}, {name:'mcp.tool-name',argsRaw:'{"path":"a"}'}, {name:'fmt.Println',argsRaw:'{}'}, {name:'func',argsRaw:'{}'}, {name:'_',argsRaw:'{}'}, {name:'$tool',argsRaw:'{}'}, {name:'read',argsRaw:'{"path":'}, {name:'read',argsRaw:'{"x":1e400}'}, {name:'read',argsRaw:'{"x":"\\ud800"}'}]) {
    assert.equal(api.codeExpression(api.codeCall(block),false,false,false,'go').fallback,true, JSON.stringify(block))
  }
  assert.equal(api.codeFunctionName('func',2,'go'), 'task_02')
  assert.equal(api.codeFunctionName('检查项目',3,'go'), '检查项目')
  assert.equal(api.codeFunctionName('_',4,'go'), 'task_04')
  const call=api.codeCall({name:'read',argsRaw:JSON.stringify({path:'a\0'+'7\n"\\😀\u202e'})})
  const syntax=api.codeExpression(call,false,false,false,'go')
  assert.equal(text(syntax), 'read("a\\0007\\n\\"\\\\😀\\u202e")')
  assert.equal(syntax.tokens.find(item=>item.key==='path').raw,'a\0'+'7\n"\\😀\u202e')
  const many=Object.fromEntries(Array.from({length:101},(_,i)=>['arg'+i,i]))
  assert.equal(api.codeExpression(api.codeCall({name:'call',argsRaw:JSON.stringify(many)}),false,false,false,'go').more,true)
})

test('error summary uses only recorded failure data and remains bounded', () => {
  const failure = {kind:'tool-result',isError:true,content:[{type:'text',text:'Permission denied\nprivate details'}]}
  assert.equal(api.codeError(failure), 'Permission denied')
  assert.equal(api.codeError({...failure,isError:false}), '')
  assert.equal(api.codeError({...failure,error:{code:'interrupted'}}), '')
  assert.equal(api.codeError({...failure,content:[],error:{name:'IOError',code:'EACCES'}}), 'IOError · EACCES')
  assert.equal(api.codeError({...failure,content:[],error:undefined}), '')
  assert.equal(api.codeError({...failure,content:[{type:'text',text:'x'.repeat(180)}]}).length, 140)
  assert.equal(api.codeError({...failure,content:[{type:'text',text:'bad\u202efile'}]}), 'bad file')
})


test('failure summaries preserve provenance and exclude interruptions', () => {
  const block = {kind:'tool-result',isError:true,content:[{type:'text',text:'Output before traceback\nMore detail'}]}
  assert.equal(api.codeErrorInfo(block).label, '结果摘要')
  assert.equal(api.codeErrorInfo(block).text, 'Output before traceback')
  assert.equal(api.codeErrorInfo({...block,error:{name:'IOError',code:'EACCES'}}).label, '错误类型')
  assert.equal(api.codeErrorInfo({...block,error:{name:'IOError',message:'Permission denied'}}).text, 'Permission denied')
  assert.equal(api.codeErrorInfo({...block,error:{code:'interrupted'}}), null)
})

test('folded scope failure counts use distinct recorded descendants', () => {
  const failed = id => ({callId:id,kind:'tool-result',isError:true,subCalls:[]})
  const stopped = {callId:'stopped',kind:'tool-result',isError:true,error:{code:'interrupted'}}
  const parent = {callId:'root',kind:'tool-result',isError:false,subCalls:[{...failed('child'),subCalls:[failed('grandchild')]},failed('child'),stopped]}
  assert.equal(api.codeDescendantFailures(parent),2)
  assert.equal(api.codeDescendantFailures({callId:'root',subCalls:[{...failed('root')}]}),0)
})


test('outcomes distinguish failure, interruption and unknown from unfinished calls', () => {
  const running={name:'code',argsRaw:'{}'}
  const failed={kind:'tool-result',isError:true}
  const stopped={kind:'tool-result',isError:true,error:{code:'interrupted'}}
  const unknown={kind:'tool-result',isError:undefined}
  const succeeded={kind:'tool-result',isError:false}
  assert.equal(api.codeOutcome(failed,'error'),'error')
  assert.equal(api.codeOutcome(stopped,'error'),'stopped')
  assert.equal(api.codeOutcome(unknown,'ok'),'unknown')
  assert.equal(api.codeOutcome(succeeded,'unknown'),'ok')
  assert.equal(api.codeOutcome(running,'unknown'),'unknown')
  assert.equal(api.codeOutcome(running,'running'),'running')
  assert.equal(api.codeOutcome(running),'pending')
  assert.equal(api.codeOutcomeLabel('error'),'失败')
  assert.equal(api.codeOutcomeLabel('stopped'),'已中断')
  assert.equal(api.codeOutcomeLabel('unknown'),'结果未知')
  assert.equal(api.codeFailed(unknown),false)
  const calls=new Map([['failed',failed],['stopped',stopped],['unknown',unknown],['running',running],['success',succeeded],['host-unknown',running]])
  assert.equal(api.codeStats(calls,new Map([['running','running'],['host-unknown','unknown']])), '已加载调用 6 · 已记录失败 1 · 已中断 1 · 结果未知 2 · 未结束 1')
})
