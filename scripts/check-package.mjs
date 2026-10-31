import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
assert.equal(lock.packages[''].version, pkg.version)
assert.equal(lock.version, pkg.version)
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
assert.equal(pkg.exports['./client'], './client.js')
assert.ok(!Object.hasOwn(pkg.engines, 'dsh'), 'do not block DSH versions through engines.dsh')
assert.ok(!Object.keys(pkg.peerDependencies || {}).some(name => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')), 'do not reintroduce a DSH version gate through peers')
assert.deepEqual(lock.packages[''].engines, pkg.engines, 'lockfile engines must match package manifest')
for (const hook of ['prepare', 'preinstall', 'install', 'postinstall', 'prepack']) {
  assert.ok(!pkg.scripts[hook], `installation must not require a lifecycle script: ${hook}`)
}
for (const [name, entry] of Object.entries(lock.packages)) {
  assert.ok(!entry.link && !name.startsWith('../'), `local lock entry: ${name}`)
  if (entry.resolved) assert.match(entry.resolved, /^https:\/\//, `nonportable dependency: ${name}`)
}

// Prefetch must register the factory without reading DOM, storage or media.
const registrations = []
vm.runInNewContext(read('client.js'), { window: { __ModuleLoader__: { load: row => registrations.push(row) } } })
assert.equal(registrations.length, 1)
assert.equal(registrations[0].id, pkg.name)
assert.equal(typeof registrations[0].factory, 'function')

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const [archive] = JSON.parse(execFileSync(npm, ['pack', '--dry-run', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8' }))
const expected = ["LICENSE", "client.js", "index.js", "docs/verification/0.10.0.json", "docs/verification/0.7.2.json", "docs/verification/0.7.3.json", "docs/verification/0.7.4.json", "docs/verification/0.8.2.json", "docs/verification/0.9.0.json", "docs/verification/0.9.1.json", "package.json", "docs/verification/rc2-final-regression.json", "docs/COMPATIBILITY.md", "docs/DISCOVER.md", "README.en.md", "README.md", "THIRD_PARTY_NOTICES.md", "docs/images/botanical.png", "docs/images/classic.png", "docs/images/code.png", "docs/images/function-code.png", "docs/images/process-tree-before-after.png", "docs/images/process-tree-states.png", "docs/images/process-tree-styles.png", "docs/images/process-tree-themes.png", "docs/images/quiet.png", "cordis.patch.yml"]
assert.deepEqual(archive.files.map(file => file.path).sort(), expected.sort(), 'unexpected publication files')
for (const readme of ['README.md', 'README.en.md']) {
  for (const match of read(readme).matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    assert.ok(archive.files.some(file => file.path === match[1]), `${readme} image missing from package: ${match[1]}`)
  }
}
for (const { path: name } of archive.files) {
  if (name.endsWith('.png')) {
    const bytes = fs.readFileSync(path.join(root, name))
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `invalid PNG: ${name}`)
    continue
  }
  if (name.endsWith('.gif')) {
    const header = fs.readFileSync(path.join(root, name)).subarray(0, 6).toString('ascii')
    assert.ok(header === 'GIF87a' || header === 'GIF89a', `invalid GIF: ${name}`)
    continue
  }
  const text = read(name)
  assert.ok(!/\/Users\/|[A-Z]:\\Users\\|file:\/|link:\/|\.dsh\/profiles\/desktop/.test(text), `local path in ${name}`)
  assert.ok(!/\bgh[pousr]_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text), `credential marker in ${name}`)
}
assert.ok(read('THIRD_PARTY_NOTICES.md').includes('Copyright (c) 2026 Asheep233'))
console.log(`Package verified: ${archive.files.length} files, ${archive.size} compressed bytes; inert factory registration; portable lockfile.`)
