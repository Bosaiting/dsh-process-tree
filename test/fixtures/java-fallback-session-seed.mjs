// Synthetic Session/PTC records only. No model or tool is invoked.
import { randomUUID } from 'node:crypto'
export const name = 'process-tree-java-fallback-fixture'
export const inject = ['agents', 'agentLoop']
export async function apply(ctx) {
  const { agent } = await ctx.agents.create({ sessionId: `dpt-java-fallback-${Date.now()}`, meta: { cwd: '/synthetic' }, agentOptions: {} })
  const session = agent.session
  const append = (type, data, surface = false) => session.append(type, data, ...(surface ? [{ surfaceOp: 'append' }] : []))
  const message = (role, content, source) => ({ id: randomUUID(), role, content, source })
  append('user/message', message('user', [{ type: 'text', text: 'Java Fallback Fixture — synthetic records; no model or tools executed.' }], { kind: 'user' }), true)
  append('turn/start', { turn: 1 })
  const calls = [
    { id: 'fallback-parent', name: 'run_code', args: { code: 'read("child.java")', options: { safe: true } } },
    { id: 'fallback-special', name: 'mcp.tool-name', args: { path: 'synthetic.txt' } },
  ]
  for (const [index, call] of calls.entries()) {
    const step = index + 1, args = JSON.stringify(call.args)
    append('step/start', { turn: 1, step })
    append('assistant/message', { turn: 1, step, stream: [], message: message('assistant', [{ type: 'tool-call', id: call.id, name: call.name, arguments: args }], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
    append('tool/call', { turn: 1, step, callId: call.id, name: call.name, arguments: args })
    if (index === 0) {
      const data = { parentCallId: call.id, subCallId: 'fallback-child', name: 'read', arguments: { path: 'child.java' } }
      append('tool/ptc-dispatch-start', { turn: 1, step, rootCallId: call.id, ...data })
      append('tool/ptc-dispatch', { turn: 1, step, rootCallId: call.id, ...data, content: [{ type: 'text', text: 'Synthetic child failure' }], isError: true })
    }
    append('tool/result', { turn: 1, step, message: { ...message('user', [{ type: 'text', text: 'Synthetic result' }], { kind: 'tool', callId: call.id }), isError: false } }, true)
    append('step/end', { turn: 1, step })
  }
  append('step/start', { turn: 1, step: 3 })
  append('assistant/message', { turn: 1, step: 3, stream: [], message: message('assistant', [{ type: 'text', text: 'Synthetic fallback fixture complete.' }], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
  append('step/end', { turn: 1, step: 3 })
  append('turn/end', { turn: 1, reason: { kind: 'completed' } })
}
