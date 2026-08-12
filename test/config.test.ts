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
      oxlint: { rules: { 'no-debugger': 'deny' } },
      oxfmt: { semi: false, singleQuote: true },
    })
  })

  test('rejects configs without an oxlint or oxfmt section', async () => {
    const { configPath } = await createUnifiedFixture('export default { unrelated: true }\n')

    await expect(loadConfig(configPath)).rejects.toThrow(/must define an oxlint or oxfmt section/)
  })

  test('rejects non-object tool sections', async () => {
    const { configPath } = await createUnifiedFixture("export default { oxlint: 'deny' }\n")

    await expect(loadConfig(configPath)).rejects.toThrow(/oxlint section.*must be an object/)
  })

  test('rejects multiple unified configs in the same directory', async () => {
    const directory = await createTempDirectory('oxc-config-bridge-multi-config-')
    await writeFile(path.join(directory, 'oxc.config.mjs'), 'export default { oxlint: {} }\n')
    await writeFile(path.join(directory, 'oxc.config.js'), 'export default { oxfmt: {} }\n')

    await expect(findConfig(directory)).rejects.toThrow(/Multiple unified Oxc configs found/)
  })
})