import type { OxfmtConfig } from 'oxfmt'
import type { OxlintConfig } from 'oxlint'

export type OxcTool = 'oxfmt' | 'oxlint'

export interface OxcConfig {
  fmt?: OxfmtConfig
  lint?: OxlintConfig
}

export function defineConfig<const Config extends OxcConfig>(config: Config): Config {
  return config
}

export { runTool } from './runner.js'
