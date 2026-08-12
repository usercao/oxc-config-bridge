import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import type { OxcTool } from './index.js'

const require = createRequire(import.meta.url)
const packageManifest = require('../package.json') as { version: string }

interface PackageManifest {
  bin?: string | Record<string, string>
}

export async function resolveToolBin(tool: OxcTool): Promise<string> {
  const manifestPath = require.resolve(`${tool}/package.json`)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest
  const binPath = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[tool]
  if (!binPath) {
    throw new Error(`${tool} does not expose a ${tool} CLI in its package manifest`)
  }
  return path.resolve(path.dirname(manifestPath), binPath)
}

export function enableVitePlusConfigDiscovery(environment: NodeJS.ProcessEnv): void {
  environment.VP_VERSION = packageManifest.version
  environment.VP_RESOLVING_CONFIG_METADATA ??= '1'
}