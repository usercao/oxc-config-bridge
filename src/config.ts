import { access } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { OxcConfig, OxcTool } from './index.js'

const CONFIG_FILENAMES = [
  'oxc.config.ts',
  'oxc.config.mts',
  'oxc.config.cts',
  'oxc.config.js',
  'oxc.config.mjs',
  'oxc.config.cjs',
] as const

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function findConfig(startDirectory = process.cwd()): Promise<string> {
  let directory = path.resolve(startDirectory)

  while (true) {
    const matches = (
      await Promise.all(
        CONFIG_FILENAMES.map(async (filename) => {
          const filePath = path.join(directory, filename)
          return (await exists(filePath)) ? filePath : undefined
        }),
      )
    ).filter((filePath): filePath is string => filePath !== undefined)

    if (matches.length > 1) {
      throw new Error(`Multiple unified Oxc configs found in ${directory}: ${matches.join(', ')}`)
    }
    if (matches[0]) {
      return matches[0]
    }

    const parent = path.dirname(directory)
    if (parent === directory) {
      throw new Error(`No ${CONFIG_FILENAMES.join(', ')} found from ${startDirectory}`)
    }
    directory = parent
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function loadConfig(configPath: string): Promise<OxcConfig> {
  const absolutePath = path.resolve(configPath)
  const moduleUrl = pathToFileURL(absolutePath)
  moduleUrl.searchParams.set('oxc-bridge-cache', `${Date.now()}-${Math.random()}`)

  const configModule = (await import(moduleUrl.href)) as { default?: unknown }
  if (!isObject(configModule.default)) {
    throw new TypeError(`${absolutePath} must default-export a configuration object`)
  }

  const config = configModule.default
  for (const tool of ['oxlint', 'oxfmt'] as const) {
    if (config[tool] !== undefined && !isObject(config[tool])) {
      throw new TypeError(`The ${tool} section in ${absolutePath} must be an object`)
    }
  }
  if (config.oxlint === undefined && config.oxfmt === undefined) {
    throw new TypeError(`${absolutePath} must define an oxlint or oxfmt section`)
  }

  return config as OxcConfig
}

export async function resolveConfigPath(
  configuredPath: string | undefined,
  cwd = process.cwd(),
): Promise<string> {
  return configuredPath ? path.resolve(cwd, configuredPath) : findConfig(cwd)
}

export async function assertToolConfig(configPath: string, tool: OxcTool): Promise<void> {
  const config = await loadConfig(configPath)
  if (config[tool] === undefined) {
    throw new Error(`${configPath} does not define an ${tool} section`)
  }
}
