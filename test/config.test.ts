import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'

import { findConfig, loadConfig } from '../src/config.js'
import { cleanEditorConfigs, createTemporaryProxy, prepareEditorConfigs } from '../src/proxy.js'
import {
  cleanupTemporaryDirectories,
  createTempDirectory,
  createUnifiedFixture,
  requireValue,
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

describe('proxy generation', () => {
  test('creates a temporary proxy beside the unified config and removes it', async () => {
    const { configPath, directory } = await createUnifiedFixture()
    const proxy = await createTemporaryProxy(configPath, 'oxlint')

    expect(path.dirname(proxy.path)).toBe(directory)
    expect(await readFile(proxy.path, 'utf8')).toContain('import config from "./oxc.config.mjs"')
    const proxyModule = await import(`${pathToFileURL(proxy.path).href}?test=${Date.now()}`)
    expect(proxyModule.default).toEqual({ rules: { 'no-debugger': 'deny' } })

    await proxy.remove()
    await expect(readFile(proxy.path)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('prepares and cleans stable editor configs', async () => {
    const { configPath, directory } = await createUnifiedFixture()
    const outputDirectory = path.join(directory, 'tooling', 'oxc-config-bridge')
    const paths = await prepareEditorConfigs({ configPath, outputDirectory })

    expect(paths.oxlint).toBe(path.join(outputDirectory, '.oxc-bridge.oxlint.generated.mjs'))
    expect(paths.oxfmt).toBe(path.join(outputDirectory, '.oxc-bridge.oxfmt.generated.mjs'))
    const oxlintPath = requireValue(paths.oxlint, 'oxlint editor config path')
    const oxfmtPath = requireValue(paths.oxfmt, 'oxfmt editor config path')

    expect(await readFile(oxlintPath, 'utf8')).toContain('import config from "../../oxc.config.mjs"')
    expect(await readFile(oxfmtPath, 'utf8')).toContain('import config from "../../oxc.config.mjs"')
    const lintModule = await import(`${pathToFileURL(oxlintPath).href}?test=${Date.now()}`)
    const fmtModule = await import(`${pathToFileURL(oxfmtPath).href}?test=${Date.now()}`)
    expect(lintModule.default).toEqual({ rules: { 'no-debugger': 'deny' } })
    expect(fmtModule.default).toEqual({ semi: false, singleQuote: true })

    await cleanEditorConfigs({ configPath, outputDirectory })
    await expect(readFile(oxlintPath)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(oxfmtPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('skips editor proxies for missing tool sections', async () => {
    const { configPath, directory } = await createUnifiedFixture(`export default {
  oxlint: { rules: { 'no-debugger': 'deny' } },
}\n`)
    const outputDirectory = path.join(directory, 'tooling', 'oxc-config-bridge')
    const paths = await prepareEditorConfigs({ configPath, outputDirectory })

    expect(paths.oxlint).toBe(path.join(outputDirectory, '.oxc-bridge.oxlint.generated.mjs'))
    expect(paths.oxfmt).toBeUndefined()
  })
})

  test('cleans generated editor configs when only outputDirectory is provided', async () => {
    const directory = await createTempDirectory('oxc-config-bridge-clean-output-dir-')
    const outputDirectory = path.join(directory, '.config', 'oxc')
    const oxlintPath = path.join(outputDirectory, '.oxc-bridge.oxlint.generated.mjs')
    const oxfmtPath = path.join(outputDirectory, '.oxc-bridge.oxfmt.generated.mjs')

    await mkdir(outputDirectory, { recursive: true })
    await writeFile(oxlintPath, 'export default {}\n')
    await writeFile(oxfmtPath, 'export default {}\n')

    await cleanEditorConfigs({ outputDirectory })

    await expect(readFile(oxlintPath)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(oxfmtPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })