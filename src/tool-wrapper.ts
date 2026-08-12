import { pathToFileURL } from 'node:url'

import './vite-plus-preload.js'
import type { OxcTool } from './index.js'
import { enableVitePlusConfigDiscovery, resolveToolBin } from './tool.js'

export async function runWrappedTool(tool: OxcTool): Promise<void> {
  enableVitePlusConfigDiscovery(process.env)
  await import(pathToFileURL(await resolveToolBin(tool)).href)
}