import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parse } from 'jsonc-parser'
import { afterEach, describe, expect, test } from 'vitest'

import {
  initializeVsCodeSettings,
  VITE_PLUS_VSCODE_SETTINGS,
} from '../src/vscode-settings.js'
import { cleanupTemporaryDirectories, createTempDirectory } from './helpers.js'

afterEach(async () => {
  await cleanupTemporaryDirectories()
})

describe('VS Code settings initialization', () => {
  test('creates the current Vite+ VS Code settings', async () => {
    const directory = await createTempDirectory('vite-oxc-bridge-vscode-settings-')

    await expect(initializeVsCodeSettings(directory)).resolves.toBe('created')
    const settingsText = await readFile(path.join(directory, '.vscode', 'settings.json'), 'utf8')

    expect(parse(settingsText)).toEqual(VITE_PLUS_VSCODE_SETTINGS)
  })

  test('merges missing Vite+ settings without replacing JSONC comments or existing values', async () => {
    const directory = await createTempDirectory('vite-oxc-bridge-vscode-settings-')
    const settingsPath = path.join(directory, '.vscode', 'settings.json')
    await mkdir(path.dirname(settingsPath), { recursive: true })
    await writeFile(
      settingsPath,
      `{
  // Keep project-specific formatter behavior.
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
  },
}
`,
    )

    await expect(initializeVsCodeSettings(directory)).resolves.toBe('updated')
    const settingsText = await readFile(settingsPath, 'utf8')
    const settings = parse(settingsText) as Record<string, unknown>

    expect(settingsText).toContain('// Keep project-specific formatter behavior.')
    expect(settings['editor.formatOnSave']).toBe(false)
    expect(settings['oxc.disableNestedConfig']).toBe(true)
    expect(settings['oxc.fmt.disableNestedConfig']).toBe(true)
    expect(settings['editor.codeActionsOnSave']).toEqual({
      'source.fixAll.oxc': 'explicit',
      'source.organizeImports': 'explicit',
    })
  })

  test('rejects a malformed settings file without replacing it', async () => {
    const directory = await createTempDirectory('vite-oxc-bridge-vscode-settings-')
    const settingsPath = path.join(directory, '.vscode', 'settings.json')
    await mkdir(path.dirname(settingsPath), { recursive: true })
    await writeFile(settingsPath, '{ invalid')

    await expect(initializeVsCodeSettings(directory)).rejects.toThrow(/expected a JSONC object/)
    await expect(readFile(settingsPath, 'utf8')).resolves.toBe('{ invalid')
  })
})