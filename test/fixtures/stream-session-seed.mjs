// Test-only rc.5 agent frames. No adapter, model request or tool invocation.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
export const name = 'process-tree-stream-fixture'
export const inject = ['agents', 'agentLoop']
export async function apply(ctx) {
  const root = path.resolve(process.env.DSH_STREAM_TEST_DIR || '')
  const dshHome = path.resolve(process.env.DSH_HOME || '')
  if (!process.env.DSH_STREAM_TEST_DIR || !process.env.DSH_HOME ||
      !fs.existsSync(path.join(root, '.dpt-disposable-test'))) throw new Error('stream fixture requires a marked disposable DSH_HOME')
  const rootReal = fs.realpathSync(root), homeReal = fs.realpathSync(dshHome), userHome = fs.realpathSync(os.homedir())
  const realDsh = path.join(userHome, '.dsh')
  if (rootReal === userHome || homeReal === realDsh || homeReal.startsWith(realDsh + path.sep) || !homeReal.startsWith(rootReal + path.sep)) throw new Error('refusing non-disposable DSH_HOME')
  const file = name => path.join(root, name)
  const { agent } = await ctx.agents.create({ sessionId: `dpt-stream-${Date.now()}`, meta: { cwd: root }, agentOptions: {} })
  const session = agent.session
  const message = (role, content, source) => ({ id: randomUUID(), role, content, source })
  session.append('user/message', message('user', [{ type: 'text', text: 'Process Tree Streaming Fixture' }], { kind: 'user' }), { surfaceOp: 'append' })
  // A completed seed turn gives the host a durable, discoverable session.
  session.append('turn/start', { turn: 1 }); session.append('step/start', { turn: 1, step: 1 })
  session.append('assistant/message', { turn: 1, step: 1, stream: [], message: message('assistant', [{ type: 'text', text: 'Synthetic fixture ready.' }], { kind: 'model', provider: 'fixture', model: 'fixture' }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 }); session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  let phase = 0, revision = 0, index = 0
  const attemptId = 'process-tree-synthetic-stream-1'
  const send = frame => agent.dispatch.emit('agent/assistant-stream', { frame })
  const chunk = value => send({ type: 'chunk', attemptId, revision: ++revision, index: index++, time: Date.now(), chunk: value })
  const events = [
    () => { session.append('turn/start', { turn: 2 }); session.append('step/start', { turn: 2, step: 1 }); send({ type: 'start', attemptId, revision: ++revision, turn: 2, step: 1 }); chunk({ type: 'block-start', index: 0, blockType: 'reasoning' }) },
    () => chunk({ type: 'reasoning-delta', index: 0, text: '<signature>fixture.metadata</signature>\n\n' }),
    () => chunk({ type: 'reasoning-delta', index: 0, text: 'Synthetic streaming thought.\n\n' }),
    () => chunk({ type: 'reasoning-delta', index: 0, text: 'Additional synthetic thought.' }),
    () => {
      const text = '<signature>fixture.metadata</signature>\n\nSynthetic streaming thought.\n\nAdditional synthetic thought.'
      chunk({ type: 'block-end', index: 0, block: { type: 'reasoning', text } })
      const committed = session.append('assistant/message', { turn: 2, step: 1, stream: [], message: message('assistant', [{ type: 'reasoning', text }], { kind: 'model', provider: 'fixture', model: 'fixture' }) }, { surfaceOp: 'append' })
      send({ type: 'end', attemptId, revision: ++revision, index, outcome: { kind: 'committed', eventType: 'assistant/message', seq: committed.seq } })
      session.append('step/end', { turn: 2, step: 1 }); session.append('turn/end', { turn: 2, reason: { kind: 'completed' } })
    },
  ]
  const timer = setInterval(() => {
    if (phase >= events.length || !fs.existsSync(file(`request-${phase}`))) return
    try { events[phase](); fs.writeFileSync(file(`completed-${phase}`), 'ok'); phase++ }
    catch (error) { fs.writeFileSync(file('stream-error'), String(error.stack || error)); clearInterval(timer) }
  }, 50)
  ctx.effect(() => () => clearInterval(timer), 'process-tree-stream-fixture: timer')
  console.info('[process-tree-stream-fixture] ready')
}
