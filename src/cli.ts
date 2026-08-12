#!/usr/bin/env node

import { runTool } from './runner.js'

const HELP = `Usage: oxc-config-bridge <command> [options] [tool arguments]

Commands:
  lint       Run Oxlint with the lint section from oxc.config.*
  fmt        Run Oxfmt with the fmt section from oxc.config.*

Options:
  --unified-config <path>  Use a specific bridge config instead of searching upward
  -h, --help           Show this help
`

function parseOptions(args: string[]): {
  configPath?: string
  rest: string[]
} {
  const rest: string[] = []
  let configPath: string | undefined
  let passthrough = false

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === undefined) {
      continue
    }
    if (passthrough) {
      rest.push(arg)
      continue
    }
    if (arg === '--') {
      passthrough = true
      continue
    }
    if (arg === '--unified-config') {
      configPath = args[index + 1]
      if (!configPath) {
        throw new Error('--unified-config requires a path')
      }
      index++
      continue
    }
    if (arg.startsWith('--unified-config=')) {
      configPath = arg.slice('--unified-config='.length)
      if (!configPath) {
        throw new Error('--unified-config requires a path')
      }
      continue
    }
    rest.push(arg)
  }

  return { configPath, rest }
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(HELP)
    return 0
  }

  const { configPath, rest } = parseOptions(args)
  if (command === 'lint' || command === 'fmt') {
    return runTool(command === 'lint' ? 'oxlint' : 'oxfmt', rest, { configPath })
  }

  throw new Error(`Unknown command: ${command}\n\n${HELP}`)
}

try {
  process.exitCode = await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`oxc-config-bridge: ${message}\n`)
  process.exitCode = 1
}
