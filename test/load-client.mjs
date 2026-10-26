// Loads client.js in a bare VM context and returns its test exports.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const CLIENT = fileURLToPath(new URL('../client.js', import.meta.url))
const TEST_HOOK = Symbol.for('dsh.process-tree.test')

export function loadClient() {
  let exported = null
  const store = new Map()
  const window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    __ModuleLoader__: { load(spec) { spec.factory(require) } },
    [TEST_HOOK]: (api) => { exported = api },
  }
  const context = vm.createContext({ window, document: {}, performance: { now: () => 0 } })
  vm.runInContext(readFileSync(CLIENT, 'utf8'), context, { filename: CLIENT })
  if (!exported) throw new Error('client.js did not publish its test exports')
  return exported
}
