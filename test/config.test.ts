import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { findConfig, loadConfig } from '../src/config.js'
import {
  cleanupTemporaryDirectories,
  createTempDirectory,
  createUnifiedFixture,
} from './helpers.js'

afterEach(async () => {
  await cleanupTemporaryDirectories()
})

describe('config discovery', () => {
  test('finds and loads a unified config from a parent directory', async () => {
    const { configPath, directory } = await createUnifiedFixture()
    const nestedDirectory = path.join(directory, 'packages', 'app')
    await mkdir(nestedDirectory, { recursive: true })

    expect(await findConfig(nestedDirectory)).toBe(configPath)
    expect(await loadConfig(configPath)).toEqual({
      lint: { rules: { 'no-debugger': 'deny' } },
      fmt: { semi: false, singleQuote: true },
    })
  })

  test('passes Vite+ configuration fields through without bridge validation', async () => {
    const { configPath } = await createUnifiedFixture('export default { unrelated: true }\n')

    expect(await loadConfig(configPath)).toEqual({ unrelated: true })
  })

  test('rejects a non-object default export', async () => {
    const { configPath } = await createUnifiedFixture("export default 'deny'\n")

    await expect(loadConfig(configPath)).rejects.toThrow(/must default-export a configuration object/)
  })

  test('rejects multiple unified configs in the same directory', async () => {
    const directory = await createTempDirectory('oxc-config-bridge-multi-config-')
    await writeFile(path.join(directory, 'oxc.config.mjs'), 'export default { lint: {} }\n')
    await writeFile(path.join(directory, 'oxc.config.js'), 'export default { fmt: {} }\n')

    await expect(findConfig(directory)).rejects.toThrow(/Multiple unified Oxc configs found/)
  })
})