# Vite Oxc Bridge

Use Oxc's Vite+ configuration discovery in a Vite project without installing Vite+.

## Install

```sh
npm install --save-dev vite vite-oxc-bridge
```

## Configure

Keep your project's existing `vite.config.*`. It is the discovery anchor for the nearest `oxc.config.*`.

```ts
// oxc.config.ts
import { defineConfig } from 'vite-oxc-bridge'

export default defineConfig({
  lint: { rules: { 'no-debugger': 'deny' } },
  fmt: { semi: false, singleQuote: true },
})
```

## Commands

```json
{
  "scripts": {
    "format": "vite-oxc-bridge fmt .",
    "format:check": "vite-oxc-bridge fmt --check .",
    "lint": "vite-oxc-bridge lint .",
    "lint:fix": "vite-oxc-bridge lint --fix ."
  }
}
```

## VS Code

Install the [Oxc extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode), then run:

```sh
npx vite-oxc-bridge init
```

This creates or merges Vite+-compatible settings in `.vscode/settings.json` without replacing existing values or JSONC comments. The extension discovers the package wrappers automatically; do not set `oxc.path.oxfmt` or `oxc.path.oxlint`.

## How It Works

Oxc finds `vite.config.*`, then calls the Vite+ config-loader protocol. Vite Oxc Bridge supplies that protocol and returns the nearest `oxc.config.*` unchanged. Vite and its plugins are not started.

## Requirements

- Node.js 22.18 or later
- Vite 5 or later
- An `oxc.config.*` file that default-exports an object

## Migration

Replace `oxc-config-bridge` with `vite-oxc-bridge` in dependencies, imports, and package scripts.

## License

[MIT](./LICENSE)
