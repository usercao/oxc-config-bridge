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
): Promise<Awaited<ReturnType<typeof loadConfig>>> {
  if (!options.configFile) {
    throw new TypeError('vite-plus resolveConfig requires a configFile path')
  }

  return loadConfig(options.configFile)
}