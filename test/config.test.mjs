import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { findConfig, loadConfig } from '../dist/config.js'
import { cleanEditorConfigs, createTemporaryProxy, prepareEditorConfigs } from '../dist/proxy.js'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

async function createFixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'oxc-config-bridge-test-'))
  temporaryDirectories.push(directory)
  const configPath = path.join(directory, 'oxc.config.mjs')
  await writeFile(
    configPath,
    `export default {
  oxlint: { rules: { 'no-debugger': 'deny' } },
  oxfmt: { semi: false, singleQuote: true },
}
`,
  )
  return { configPath, directory }
}

test('finds and loads a unified config from a parent directory', async () => {
  const { configPath, directory } = await createFixture()
  const nestedDirectory = path.join(directory, 'packages', 'app')
  await mkdir(nestedDirectory, { recursive: true })

  assert.equal(await findConfig(nestedDirectory), configPath)
  assert.deepEqual(await loadConfig(configPath), {
    oxlint: { rules: { 'no-debugger': 'deny' } },
    oxfmt: { semi: false, singleQuote: true },
  })
})

test('creates a temporary proxy beside the unified config and removes it', async () => {
  const { configPath, directory } = await createFixture()
  const proxy = await createTemporaryProxy(configPath, 'oxlint')

  assert.equal(path.dirname(proxy.path), directory)
  const proxyModule = await import(`${pathToFileURL(proxy.path).href}?test=${Date.now()}`)
  assert.deepEqual(proxyModule.default, { rules: { 'no-debugger': 'deny' } })

  await proxy.remove()
  await assert.rejects(readFile(proxy.path), { code: 'ENOENT' })
})

test('prepares and cleans stable editor configs', async () => {
  const { configPath, directory } = await createFixture()
  const outputDirectory = path.join(directory, 'tooling', 'oxc-config-bridge')
  const paths = await prepareEditorConfigs({ configPath, outputDirectory })

  assert.equal(paths.oxlint, path.join(outputDirectory, '.oxc-bridge.oxlint.generated.mjs'))
  assert.equal(paths.oxfmt, path.join(outputDirectory, '.oxc-bridge.oxfmt.generated.mjs'))

  const lintModule = await import(`${pathToFileURL(paths.oxlint).href}?test=${Date.now()}`)
  const fmtModule = await import(`${pathToFileURL(paths.oxfmt).href}?test=${Date.now()}`)
  assert.deepEqual(lintModule.default, { rules: { 'no-debugger': 'deny' } })
  assert.deepEqual(fmtModule.default, { semi: false, singleQuote: true })

  await cleanEditorConfigs({ configPath, outputDirectory })
  await assert.rejects(readFile(paths.oxlint), { code: 'ENOENT' })
  await assert.rejects(readFile(paths.oxfmt), { code: 'ENOENT' })
})
