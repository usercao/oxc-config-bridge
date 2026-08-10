import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { constants as osConstants } from 'node:os'
import path from 'node:path'

import { resolveConfigPath } from './config.js'
import type { OxcTool } from './index.js'
import { createTemporaryProxy } from './proxy.js'

const require = createRequire(import.meta.url)
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const

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

function excludeProxy(tool: OxcTool, args: string[], proxyPath: string, cwd: string): string[] {
  const relativePath = path.relative(cwd, proxyPath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return args
  }

  const pattern = relativePath.split(path.sep).join('/')
  return tool === 'oxfmt' ? [...args, `!${pattern}`] : [`--ignore-pattern=${pattern}`, ...args]
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
  const proxy = await createTemporaryProxy(configPath, tool)

  try {
    const binPath = await resolveToolBin(tool)
    const toolArgs = excludeProxy(tool, args, proxy.path, cwd)
    const child = spawn(process.execPath, [binPath, '--config', proxy.path, ...toolArgs], {
      cwd,
      env: process.env,
      stdio: 'inherit',
    })
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
  } finally {
    await proxy.remove()
  }
}
