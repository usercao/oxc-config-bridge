import { spawn } from 'node:child_process'
import { constants as osConstants } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { OxcTool } from './index.js'
import { enableVitePlusConfigDiscovery, resolveToolBin } from './tool.js'

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const
const VITE_PLUS_PRELOAD_URL = new URL(
  `./vite-plus-preload${path.extname(fileURLToPath(import.meta.url))}`,
  import.meta.url,
).href

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
  options?: { cwd?: string; onOutput?: (output: string) => void },
): Promise<number> {
  const cwd = path.resolve(options?.cwd ?? process.cwd())
  const binPath = await resolveToolBin(tool)
  const environment = { ...process.env }
  enableVitePlusConfigDiscovery(environment, tool)
  const child = spawn(process.execPath, ['--import', VITE_PLUS_PRELOAD_URL, binPath, ...args], {
    cwd,
    env: environment,
    stdio: options?.onOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  })
  if (options?.onOutput) {
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => options.onOutput!(chunk))
    child.stderr?.on('data', (chunk: string) => options.onOutput!(chunk))
  }
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
