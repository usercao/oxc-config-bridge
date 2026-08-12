import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { constants as osConstants } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveConfigPath } from './config.js'
import type { OxcTool } from './index.js'

const require = createRequire(import.meta.url)
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const
const VITE_PLUS_PRELOAD_URL = new URL(
  `./vite-plus-preload${path.extname(fileURLToPath(import.meta.url))}`,
  import.meta.url,
).href

interface PackageManifest {
  bin?: string | Record<string, string>
}

async function resolveToolBin(tool: OxcTool): Promise<string> {
  const manifestPath = require.resolve(`${tool}/package.json`)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest
  const binPath = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[tool]
  if (!binPath) {
    throw new Error(`${tool} does not expose a ${tool} CLI in its package manifest`)
  }
  return path.resolve(path.dirname(manifestPath), binPath)
}

function hasNativeConfigArgument(args: string[]): boolean {
  return args.some((arg) => arg === '-c' || arg === '--config' || arg.startsWith('--config='))
}

function signalExitCode(signal: NodeJS.Signals | null): number {
  if (!signal) {
    return 1
  }
  const signalNumber = osConstants.signals[signal]
  return signalNumber === undefined ? 1 : 128 + signalNumber
}

export async function runTool(
  tool: OxcTool,
  args: string[],
  options?: { configPath?: string; cwd?: string },
): Promise<number> {
  if (hasNativeConfigArgument(args)) {
    throw new Error(
      `Do not pass ${tool} --config through this bridge; use --unified-config to select the bridge config`,
    )
  }

  const cwd = path.resolve(options?.cwd ?? process.cwd())
  const configPath = await resolveConfigPath(options?.configPath, cwd)
  const binPath = await resolveToolBin(tool)
  const child = spawn(
    process.execPath,
    ['--import', VITE_PLUS_PRELOAD_URL, binPath, '--config', configPath, ...args],
    {
      cwd,
      env: { ...process.env, VP_VERSION: '1' },
      stdio: 'inherit',
    },
  )
  const listeners = FORWARDED_SIGNALS.map((signal) => {
    const listener = () => child.kill(signal)
    process.once(signal, listener)
    return [signal, listener] as const
  })

  try {
    return await new Promise<number>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => resolve(code ?? signalExitCode(signal)))
    })
  } finally {
    for (const [signal, listener] of listeners) {
      process.removeListener(signal, listener)
    }
  }
}
