import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const temporaryDirectories: string[] = []

export async function createTempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

export async function cleanupTemporaryDirectories(): Promise<void> {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
}

export async function writeUnifiedConfig(
  directory: string,
  source = `export default {
  lint: { rules: { 'no-debugger': 'deny' } },
  fmt: { semi: false, singleQuote: true },
}
`,
): Promise<string> {
  const configPath = path.join(directory, 'oxc.config.mjs')
  await writeFile(configPath, source)
  return configPath
}

export async function createUnifiedFixture(source?: string): Promise<{
  configPath: string
  directory: string
}> {
  const directory = await createTempDirectory('oxc-config-bridge-test-')
  const configPath = await writeUnifiedConfig(directory, source)
  await writeFile(path.join(directory, 'vite.config.ts'), 'export default {}\n')
  return { configPath, directory }
}
