import { existsSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function resolveWindowsTsgolintExecutable(pathCandidates: string[]): string {
  let executablePath = pathCandidates.find((candidate) => existsSync(candidate))

  if (!executablePath) {
    try {
      const realPackageDirectory = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'))
      const realBinDirectory = join(dirname(realPackageDirectory), '.bin')
      executablePath = [
        join(realBinDirectory, 'tsgolint.exe'),
        join(realBinDirectory, 'tsgolint.cmd'),
      ].find((candidate) => existsSync(candidate))
      } catch {}
  }

  if (!executablePath) {
    throw new Error(
      `Unable to resolve oxlint-tsgolint executable, tried:\n${pathCandidates
        .map((candidate) => `- ${candidate}`)
        .join('\n')}`,
    )
  }

  return executablePath
}

export function resolveTsgolintExecutable(tsgolintBinPath: string): string {
  if (process.platform !== 'win32') {
    return tsgolintBinPath
  }

  const scriptDirectory = dirname(fileURLToPath(import.meta.url))
  const localBinDirectory = join(scriptDirectory, '..', 'node_modules', '.bin')
  const packageBinDirectory = join(dirname(dirname(tsgolintBinPath)), '..', '.bin')
  return resolveWindowsTsgolintExecutable([
    join(localBinDirectory, 'tsgolint.exe'),
    join(localBinDirectory, 'tsgolint.cmd'),
    join(packageBinDirectory, 'tsgolint.exe'),
    join(packageBinDirectory, 'tsgolint.cmd'),
  ])
}