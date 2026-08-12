import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleExtension = path.extname(fileURLToPath(import.meta.url))
const shimUrl = new URL(`./vite-plus-shim${moduleExtension}`, import.meta.url).href

interface ResolveResult {
  shortCircuit?: boolean
  url: string
}

type NextResolve = (specifier: string, context: unknown) => Promise<ResolveResult>

export function resolve(
  specifier: string,
  context: unknown,
  nextResolve: NextResolve,
): Promise<ResolveResult> | ResolveResult {
  if (specifier === 'vite-plus') {
    return { shortCircuit: true, url: shimUrl }
  }
  return nextResolve(specifier, context)
}