import { register } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleExtension = path.extname(fileURLToPath(import.meta.url))

register(new URL(`./vite-plus-loader${moduleExtension}`, import.meta.url), import.meta.url)
