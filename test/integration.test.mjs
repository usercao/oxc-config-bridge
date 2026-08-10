import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'

import { runTool } from '../dist/runner.js'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

async function createFixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'oxc-config-bridge-integration-'))
  temporaryDirectories.push(directory)
  await writeFile(
    path.join(directory, 'oxc.config.mjs'),
    `export default {
  oxlint: { rules: { 'no-debugger': 'deny' } },
  oxfmt: { semi: false, singleQuote: true },
}
`,
  )
  return directory
}

test('runs Oxfmt and Oxlint with their unified config sections', async () => {
  const directory = await createFixture()
  const sourcePath = path.join(directory, 'source.ts')
  await writeFile(sourcePath, `const message = "hello";\nconsole.log(message);\n`)

  assert.equal(await runTool('oxfmt', ['source.ts'], { cwd: directory }), 0)
  assert.equal(
    await readFile(sourcePath, 'utf8'),
    `const message = 'hello'\nconsole.log(message)\n`,
  )
  assert.equal(await runTool('oxfmt', ['--check', '.'], { cwd: directory }), 0)
  assert.equal(await runTool('oxlint', ['source.ts'], { cwd: directory }), 0)

  const remainingFiles = await readdir(directory)
  assert.equal(
    remainingFiles.some((filename) => /^\.oxc-bridge\.(oxlint|oxfmt)\./.test(filename)),
    false,
  )
})

test('returns the underlying Oxlint failure code and still cleans its proxy', async () => {
  const directory = await createFixture()
  await writeFile(path.join(directory, 'source.ts'), 'debugger\n')

  assert.notEqual(await runTool('oxlint', ['source.ts'], { cwd: directory }), 0)
  const remainingFiles = await readdir(directory)
  assert.equal(
    remainingFiles.some((filename) => filename.startsWith('.oxc-bridge.oxlint.')),
    false,
  )
})

test('preserves sortPackageJson rules for package.json files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'oxc-config-bridge-package-json-'))
  temporaryDirectories.push(directory)

  await writeFile(
    path.join(directory, 'oxc.config.mjs'),
    `export default {
  oxfmt: {
    sortPackageJson: {
      sortScripts: true,
    },
  },
}\n`,
  )
  const packageJsonPath = path.join(directory, 'package.json')
  await writeFile(
    packageJsonPath,
    `{
  "name": "fixture",
  "scripts": {
    "zeta": "echo z",
    "alpha": "echo a",
    "beta": "echo b"
  }
}\n`,
  )

  assert.equal(await runTool('oxfmt', ['.'], { cwd: directory }), 0)
  assert.equal(
    await readFile(packageJsonPath, 'utf8'),
    `{
  "name": "fixture",
  "scripts": {
    "alpha": "echo a",
    "beta": "echo b",
    "zeta": "echo z"
  }
}\n`,
  )
})

test('rejects a second native config argument', async () => {
  const directory = await createFixture()

  await assert.rejects(runTool('oxlint', ['--config', 'other.ts'], { cwd: directory }), {
    message: /use --unified-config/,
  })
})
