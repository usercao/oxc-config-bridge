#!/usr/bin/env node

import { cleanEditorConfigs, prepareEditorConfigs } from './proxy.js'
import { runTool } from './runner.js'

const HELP = `Usage: oxc-config-bridge <command> [options] [tool arguments]

Commands:
  lint       Run Oxlint with the oxlint section from oxc.config.*
  fmt        Run Oxfmt with the oxfmt section from oxc.config.*
  prepare    Generate stable proxy configs for editor integrations
  clean      Remove generated editor proxy configs

Options:
  --unified-config <path>  Use a specific bridge config instead of searching upward
  --output-dir <path>  Write prepare/clean proxies to a specific directory
  -h, --help           Show this help
`

function parseOptions(args: string[]): {
  configPath?: string
  outputDirectory?: string
  rest: string[]
} {
  const rest: string[] = []
  let configPath: string | undefined
  let outputDirectory: string | undefined
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
    if (arg === '--output-dir') {
      outputDirectory = args[index + 1]
      if (!outputDirectory) {
        throw new Error('--output-dir requires a path')
      }
      index++
      continue
    }
    if (arg.startsWith('--output-dir=')) {
      outputDirectory = arg.slice('--output-dir='.length)
      if (!outputDirectory) {
        throw new Error('--output-dir requires a path')
      }
      continue
    }
    rest.push(arg)
  }

  return { configPath, outputDirectory, rest }
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(HELP)
    return 0
  }

  const { configPath, outputDirectory, rest } = parseOptions(args)
  if (command === 'lint' || command === 'fmt') {
    if (outputDirectory) {
      throw new Error('--output-dir is only supported by prepare and clean')
    }
    return runTool(command === 'lint' ? 'oxlint' : 'oxfmt', rest, { configPath })
  }
  if (rest.length > 0) {
    throw new Error(`${command} does not accept positional arguments: ${rest.join(' ')}`)
  }
  if (command === 'prepare') {
    const paths = await prepareEditorConfigs({ configPath, outputDirectory })
    for (const [tool, generatedPath] of Object.entries(paths)) {
      process.stdout.write(`${tool}: ${generatedPath}\n`)
    }
    return 0
  }
  if (command === 'clean') {
    await cleanEditorConfigs({ configPath, outputDirectory })
    return 0
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
