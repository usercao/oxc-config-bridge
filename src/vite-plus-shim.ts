import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleExtension = path.extname(fileURLToPath(import.meta.url))
const { loadConfig } = (await import(
  new URL(`./config${moduleExtension}`, import.meta.url).href
)) as typeof import('./config.js')

interface ResolveConfigOptions {
  configFile?: string
}

export async function resolveConfig(
  options: ResolveConfigOptions,
  _command: 'build' | 'serve',
): Promise<Record<string, unknown>> {
  if (!options.configFile) {
    throw new TypeError('vite-plus resolveConfig requires a configFile path')
  }

  const config = await loadConfig(options.configFile)
  const resolvedConfig: Record<string, unknown> = {}
  if (config.oxlint !== undefined) {
    resolvedConfig.lint = config.oxlint
  }
  if (config.oxfmt !== undefined) {
    resolvedConfig.fmt = config.oxfmt
  }
  return resolvedConfig
}