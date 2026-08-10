import type { OxfmtConfig } from 'oxfmt'
import type { OxlintConfig } from 'oxlint'

export type OxcTool = 'oxfmt' | 'oxlint'

export interface OxcConfig {
  oxfmt?: OxfmtConfig
  oxlint?: OxlintConfig
}

export function defineConfig<const Config extends OxcConfig>(config: Config): Config {
  return config
}

export { cleanEditorConfigs, prepareEditorConfigs } from './proxy.js'
export { runTool } from './runner.js'
