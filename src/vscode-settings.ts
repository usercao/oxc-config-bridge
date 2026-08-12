import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { applyEdits, modify, parse, type FormattingOptions, type ParseError } from 'jsonc-parser'

type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string

interface JsonObject {
  [key: string]: JsonValue
}

export const VITE_PLUS_VSCODE_SETTINGS: JsonObject = {
  'editor.defaultFormatter': 'oxc.oxc-vscode',
  '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
  '[javascriptreact]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
  '[typescript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
  '[typescriptreact]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
  'oxc.disableNestedConfig': true,
  'oxc.fmt.disableNestedConfig': true,
  'editor.formatOnSave': true,
  'editor.formatOnSaveMode': 'file',
  'editor.codeActionsOnSave': { 'source.fixAll.oxc': 'explicit' },
}

export type VsCodeSettingsInitialization = 'created' | 'unchanged' | 'updated'

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}

function detectFormattingOptions(text: string): FormattingOptions {
  const indentation = /^([\t ]+)"/m.exec(text)?.[1] ?? '  '

  return {
    eol: text.includes('\r\n') ? '\r\n' : '\n',
    insertSpaces: !indentation.includes('\t'),
    tabSize: indentation.includes('\t') ? 1 : indentation.length,
  }
}

function serializeSettings(formattingOptions: FormattingOptions): string {
  const text = JSON.stringify(VITE_PLUS_VSCODE_SETTINGS, null, formattingOptions.tabSize ?? 2)
  return text.replaceAll('\n', formattingOptions.eol ?? '\n') + (formattingOptions.eol ?? '\n')
}

function mergeMissingSettings(
  text: string,
  existing: JsonObject,
  incoming: JsonObject,
  formattingOptions: FormattingOptions,
): string {
  let updatedText = text

  function insertMissingSettings(
    existingNode: JsonObject,
    incomingNode: JsonObject,
    currentPath: string[],
  ): void {
    for (const [key, incomingValue] of Object.entries(incomingNode)) {
      const existingValue = existingNode[key]
      const settingPath = [...currentPath, key]

      if (!(key in existingNode)) {
        updatedText = applyEdits(
          updatedText,
          modify(updatedText, settingPath, incomingValue, { formattingOptions }),
        )
      } else if (isJsonObject(existingValue) && isJsonObject(incomingValue)) {
        insertMissingSettings(existingValue, incomingValue, settingPath)
      }
    }
  }

  insertMissingSettings(existing, incoming, [])
  return updatedText
}

export async function initializeVsCodeSettings(
  projectRoot = process.cwd(),
): Promise<VsCodeSettingsInitialization> {
  const settingsPath = path.join(projectRoot, '.vscode', 'settings.json')
  let originalText: string

  try {
    originalText = await readFile(settingsPath, 'utf8')
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error
    }

    const formattingOptions = detectFormattingOptions('')
    await mkdir(path.dirname(settingsPath), { recursive: true })
    await writeFile(settingsPath, serializeSettings(formattingOptions), 'utf8')
    return 'created'
  }

  const formattingOptions = detectFormattingOptions(originalText)
  if (originalText.trim().length === 0) {
    await writeFile(settingsPath, serializeSettings(formattingOptions), 'utf8')
    return 'updated'
  }

  const errors: ParseError[] = []
  const existing = parse(originalText, errors, { allowTrailingComma: true })
  if (errors.length > 0 || !isJsonObject(existing)) {
    throw new Error(`Unable to merge ${path.relative(projectRoot, settingsPath)}: expected a JSONC object`)
  }

  const updatedText = mergeMissingSettings(
    originalText,
    existing,
    VITE_PLUS_VSCODE_SETTINGS,
    formattingOptions,
  )
  if (updatedText === originalText) {
    return 'unchanged'
  }

  await writeFile(settingsPath, updatedText, 'utf8')
  return 'updated'
}