// Synthetic Session events only: no agent run, model request or tool execution.
import { randomUUID } from 'node:crypto'
export const name = 'process-tree-function-fixture'
export const inject = ['agents', 'agentLoop']
export async function apply(ctx) {
  const { agent } = await ctx.agents.create({ sessionId: `dpt-function-${Date.now()}`, meta: { cwd: process.cwd() }, agentOptions: {} })
  const session = agent.session
  const append = (type, data, surface = false) => session.append(type, data, ...(surface ? [{ surfaceOp: 'append' }] : []))
  const message = (role, content, source) => ({ id: randomUUID(), role, content, source })
  append('user/message', message('user', [{ type: 'text', text: 'Function Code Fixture — synthetic records; no model or tools executed.' }], { kind: 'user' }), true)
  append('turn/start', { turn: 1 })
  const records = [
    ['read', { path: 'package.json', offset: 10, limit: 40 }],
    ['bash', { command: 'npm test', cwd: './demo' }],
    ['write', { path: 'report.txt', content: 'Synthetic report\n' + 'Long argument for disclosure validation. '.repeat(10) }],
    ['code', { code: 'read(path="src/index.ts")' }],
    ['read', { path: 'interrupted.txt' }],
  ]
  for (let index = 0; index < records.length; index++) {
    const step = index + 1, callId = `function-call-${step}`, [name, args] = records[index]
    append('step/start', { turn: 1, step })
    append('assistant/message', { turn: 1, step, stream: [], message: message('assistant', [
      { type: 'reasoning', text: `检查合成步骤 ${step}，保留真实参数和原始结果。` },
      { type: 'tool-call', id: callId, name, arguments: JSON.stringify(args) },
    ], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
    append('tool/call', { turn: 1, step, callId, name, arguments: JSON.stringify(args) })
    if (step === 4) {
      for (const data of [
        { parentCallId: callId, subCallId: 'function-child-1', name: 'read', arguments: { path: 'src/index.ts' } },
        { parentCallId: callId, subCallId: 'function-child-2', name: 'code', arguments: { code: 'write(path="summary.txt", content="ready")' } },
        { parentCallId: 'function-child-2', subCallId: 'function-grandchild', name: 'write', arguments: { path: 'summary.txt', content: 'ready' } },
      ]) {
        append('tool/ptc-dispatch-start', { turn: 1, step, rootCallId: callId, ...data })
        append('tool/ptc-dispatch', { turn: 1, step, rootCallId: callId, ...data, content: [{ type: 'text', text: data.subCallId === 'function-grandchild' ? 'Synthetic nested failure.' : 'Synthetic child result.' }], isError: data.subCallId === 'function-grandchild' })
      }
    }
    append('tool/result', { turn: 1, step, ...(step === 5 ? { error: { name: 'Interrupted', code: 'interrupted' } } : {}), message: { ...message('user', [{ type: 'text', text: `Synthetic output ${step}.` }], { kind: 'tool', callId }), isError: step === 2 || step === 5 } }, true)
    append('step/end', { turn: 1, step })
  }
  append('step/start', { turn: 1, step: 6 })
  append('assistant/message', { turn: 1, step: 6, stream: [], message: message('assistant', [{ type: 'text', text: 'Synthetic function fixture complete.' }], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
  append('step/end', { turn: 1, step: 6 })
  append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  console.info('[process-tree-function-fixture] ready')
}
