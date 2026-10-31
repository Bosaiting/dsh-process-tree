// Synthetic records only; this fixture does not run a model or tool.
import { randomUUID } from 'node:crypto'
export const name = 'process-tree-code-font-fixture'
export const inject = ['agents', 'agentLoop']
export async function apply(ctx) {
  const { agent } = await ctx.agents.create({ sessionId: `dpt-code-font-${Date.now()}`, meta: { cwd: '/synthetic' }, agentOptions: {} })
  const session = agent.session
  const append = (type, data, surface = false) => session.append(type, data, ...(surface ? [{ surfaceOp: 'append' }] : []))
  const message = (role, content, source) => ({ id: randomUUID(), role, content, source })
  const callId = 'font-run-code', name = 'run_code'
  const args = JSON.stringify({ code: 'const marker = "synthetic code";\nconsole.log(marker);', description: 'Synthetic code font fixture' })
  append('user/message', message('user', [{ type: 'text', text: 'Code Font Fixture — synthetic records; no model or tools executed.' }], { kind: 'user' }), true)
  append('turn/start', { turn: 1 })
  append('step/start', { turn: 1, step: 1 })
  append('assistant/message', { turn: 1, step: 1, stream: [], message: message('assistant', [{ type: 'tool-call', id: callId, name, arguments: args }], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
  append('tool/call', { turn: 1, step: 1, callId, name, arguments: args })
  append('tool/result', { turn: 1, step: 1, message: { ...message('user', [{ type: 'text', text: 'Synthetic output' }], { kind: 'tool', callId }), isError: false } }, true)
  append('step/end', { turn: 1, step: 1 })
  append('step/start', { turn: 1, step: 2 })
  append('assistant/message', { turn: 1, step: 2, stream: [], message: message('assistant', [{ type: 'text', text: 'Synthetic font fixture complete.' }], { kind: 'model', provider: 'fixture', model: 'no-network' }) }, true)
  append('step/end', { turn: 1, step: 2 })
  append('turn/end', { turn: 1, reason: { kind: 'completed' } })
}
