// Test-only host plugin. Emits synthetic, completed records through the real
// Session API on an idle host agent. It never runs that agent, calls a model or executes a tool.
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const name = 'process-tree-compatibility-fixture'
export const inject = ['agents', 'agentLoop']

export async function apply(ctx) {
  const root = path.resolve(process.env.DPT_PERF_TEST_ROOT || '')
  const home = path.resolve(process.env.DSH_HOME || '')
  if (!process.env.DPT_PERF_TEST_ROOT || !process.env.DSH_HOME || !fs.existsSync(path.join(root, '.dpt-disposable-test'))) throw new Error('performance fixture requires a marked disposable root')
  const rootReal = fs.realpathSync(root), homeReal = fs.realpathSync(home), realDsh = path.join(fs.realpathSync(os.homedir()), '.dsh')
  if (homeReal === realDsh || homeReal.startsWith(realDsh + path.sep) || !homeReal.startsWith(rootReal + path.sep)) throw new Error('refusing non-disposable DSH_HOME')
  const total = Number(process.env.DPT_ROWS || '200')
  const { agent } = await ctx.agents.create({ sessionId: `dpt-compat-${Date.now()}`, meta: { cwd: process.cwd() }, agentOptions: {} })
  const session = agent.session
  const append = (type, data, surface = false) => session.append(type, data, ...(surface ? [{ surfaceOp: 'append' }] : []))
  const message = (role, content, source) => ({ id: randomUUID(), role, content, source })
  append('user/message', message('user', [{ type: 'text', text: 'Process Tree Compatibility Fixture — synthetic local records; no model requests.' }], { kind: 'user' }), true)
  append('turn/start', { turn: 1 })
  for (let step = 1; step <= total; step++) {
    const callId = `fixture-call-${step}`
    append('step/start', { turn: 1, step })
    append('assistant/message', {
      turn: 1, step, stream: [],
      message: message('assistant', [
        { type: 'reasoning', text: `${step === 1 ? '<signature>fixture.metadata</signature>\n\n' : ''}Inspect synthetic record ${step}.` },
        { type: 'tool-call', id: callId, name: 'read', arguments: JSON.stringify({ path: `fixture-${step}.txt` }) },
      ], { kind: 'model', provider: 'compatibility-fixture', model: 'no-network' }),
    }, true)
    append('tool/call', { turn: 1, step, callId, name: 'read', arguments: JSON.stringify({ path: `fixture-${step}.txt` }) })
    append('tool/result', {
      turn: 1, step,
      message: message('user', [{ type: 'text', text: `Synthetic output ${step}\n${'Local renderer compatibility data.\n'.repeat(2)}` }], { kind: 'tool', callId }),
    }, true)
    append('step/end', { turn: 1, step })
  }
  append('step/start', { turn: 1, step: total + 1 })
  append('assistant/message', { turn: 1, step: total + 1, stream: [], message: message('assistant', [{ type: 'text', text: 'Synthetic compatibility fixture complete.' }], { kind: 'model', provider: 'compatibility-fixture', model: 'no-network' }) }, true)
  append('step/end', { turn: 1, step: total + 1 })
  append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  console.info(`[process-tree-fixture] ready ${session.id}`)
}
