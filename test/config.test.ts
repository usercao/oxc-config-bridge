import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'

import { findConfig, loadConfig } from '../src/config.js'
import { cleanEditorConfigs, createTemporaryProxy, prepareEditorConfigs } from '../src/proxy.js'

const temporaryDirectories: string[] = []

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

  expect(await findConfig(nestedDirectory)).toBe(configPath)
  expect(await loadConfig(configPath)).toEqual({
    oxlint: { rules: { 'no-debugger': 'deny' } },
    oxfmt: { semi: false, singleQuote: true },
  })
})

test('creates a temporary proxy beside the unified config and removes it', async () => {
  const { configPath, directory } = await createFixture()
  const proxy = await createTemporaryProxy(configPath, 'oxlint')

  expect(path.dirname(proxy.path)).toBe(directory)
  const proxyModule = await import(`${pathToFileURL(proxy.path).href}?test=${Date.now()}`)
  expect(proxyModule.default).toEqual({ rules: { 'no-debugger': 'deny' } })

  await proxy.remove()
  await expect(readFile(proxy.path)).rejects.toMatchObject({ code: 'ENOENT' })
})

test('prepares and cleans stable editor configs', async () => {
  const { configPath, directory } = await createFixture()
  const outputDirectory = path.join(directory, 'tooling', 'oxc-config-bridge')
  const paths = await prepareEditorConfigs({ configPath, outputDirectory })

  expect(paths.oxlint).toBe(path.join(outputDirectory, '.oxc-bridge.oxlint.generated.mjs'))
  expect(paths.oxfmt).toBe(path.join(outputDirectory, '.oxc-bridge.oxfmt.generated.mjs'))

  const lintModule = await import(`${pathToFileURL(paths.oxlint!).href}?test=${Date.now()}`)
  const fmtModule = await import(`${pathToFileURL(paths.oxfmt!).href}?test=${Date.now()}`)
  expect(lintModule.default).toEqual({ rules: { 'no-debugger': 'deny' } })
  expect(fmtModule.default).toEqual({ semi: false, singleQuote: true })

  await cleanEditorConfigs({ configPath, outputDirectory })
  await expect(readFile(paths.oxlint!)).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(readFile(paths.oxfmt!)).rejects.toMatchObject({ code: 'ENOENT' })
})