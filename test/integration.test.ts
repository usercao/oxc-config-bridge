import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { runTool } from '../src/runner.js'
import { cleanupTemporaryDirectories, createTempDirectory, createUnifiedFixture } from './helpers.js'

afterEach(async () => {
  await cleanupTemporaryDirectories()
})

describe('runner integration', () => {
  test('runs Oxfmt and Oxlint with their unified config sections without CLI proxies', async () => {
    const { directory } = await createUnifiedFixture()
    const sourcePath = path.join(directory, 'source.ts')
    await writeFile(sourcePath, `const message = "hello";\nconsole.log(message);\n`)

    expect(await runTool('oxfmt', ['source.ts'], { cwd: directory })).toBe(0)
    expect(await readFile(sourcePath, 'utf8')).toBe(`const message = 'hello'\nconsole.log(message)\n`)
    expect(await runTool('oxfmt', ['--check', '.'], { cwd: directory })).toBe(0)
    expect(await runTool('oxlint', ['source.ts'], { cwd: directory })).toBe(0)

    const remainingFiles = await readdir(directory)
    expect(remainingFiles.some((filename) => /^\.oxc-bridge\.(oxlint|oxfmt)\./.test(filename))).toBe(
      false,
    )
  })

  test('loads a parent unified config from a nested working directory', async () => {
    const { directory } = await createUnifiedFixture()
    const nestedDirectory = path.join(directory, 'packages', 'app')
    await mkdir(nestedDirectory, { recursive: true })
    const sourcePath = path.join(nestedDirectory, 'source.ts')
    await writeFile(sourcePath, 'const message = "hello";\n')

    expect(await runTool('oxfmt', ['source.ts'], { cwd: nestedDirectory })).toBe(0)
    expect(await readFile(sourcePath, 'utf8')).toBe("const message = 'hello'\n")
  })

  test('returns the underlying Oxlint failure code without creating a CLI proxy', async () => {
    const { directory } = await createUnifiedFixture()
    await writeFile(path.join(directory, 'source.ts'), 'debugger\n')

    expect(await runTool('oxlint', ['source.ts'], { cwd: directory })).not.toBe(0)
    const remainingFiles = await readdir(directory)
    expect(remainingFiles.some((filename) => filename.startsWith('.oxc-bridge.oxlint.'))).toBe(false)
  })

  test('preserves sortPackageJson rules for package.json files', async () => {
    const directory = await createTempDirectory('oxc-config-bridge-package-json-')

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

    expect(await runTool('oxfmt', ['.'], { cwd: directory })).toBe(0)
    expect(await readFile(packageJsonPath, 'utf8')).toBe(`{
  "name": "fixture",
  "scripts": {
    "alpha": "echo a",
    "beta": "echo b",
    "zeta": "echo z"
  }
}\n`)
  })

  test('rejects a second native config argument', async () => {
    const { directory } = await createUnifiedFixture()

    await expect(runTool('oxlint', ['--config', 'other.ts'], { cwd: directory })).rejects.toThrow(
      /use --unified-config/,
    )
  })

  test('fails when the selected tool section is missing', async () => {
    const { directory } = await createUnifiedFixture(`export default {
  oxfmt: { semi: false },
}\n`)

    await expect(runTool('oxlint', ['source.ts'], { cwd: directory })).rejects.toThrow(
      /does not define an oxlint section/,
    )
  })
})