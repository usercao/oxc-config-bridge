# Oxc Config Bridge

Use the Vite+ `lint` and `fmt` configuration fields with Oxlint and Oxfmt in a Vite project, without installing Vite+.

## Installation

```sh
npm install --save-dev vite oxc-config-bridge oxlint oxfmt
```

Add the bridge commands to `package.json`:

```json
{
  "scripts": {
    "format": "oxc-config-bridge fmt .",
    "format:check": "oxc-config-bridge fmt --check .",
    "lint": "oxc-config-bridge lint .",
    "lint:fix": "oxc-config-bridge lint --fix ."
  }
}
```

## Configuration

`vite.config.ts` is required. Oxc uses it as the native Vite+ discovery anchor; the bridge then reads the nearest `oxc.config.*` from that directory upward.

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({})
```

```ts
// oxc.config.ts
import { defineConfig } from 'oxc-config-bridge'

export default defineConfig({
  lint: {
    rules: {
      'no-debugger': 'deny',
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
  },
})
```

## CLI

```sh
oxc-config-bridge lint --deny-warnings .
oxc-config-bridge fmt --check .
oxc-config-bridge fmt .
```

`oxc.config.*` uses the same `lint` and `fmt` fields as Vite+. The bridge sets Oxc's Vite+ discovery environment and supplies the minimal `vite-plus.resolveConfig()` protocol that Oxc calls after finding `vite.config.ts`. The shim resolves the nearest `oxc.config.*` and returns it unchanged, so Oxlint and Oxfmt retain their native validation and diagnostics. Vite itself and its plugins are not started or evaluated.

## VS Code

The package also exposes Vite+-style `oxfmt` and `oxlint` wrappers. Package managers can choose a colliding native Oxc bin instead, so point the official Oxc extension at the wrappers to make discovery deterministic:

```jsonc
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": true,
  "oxc.path.oxfmt": "./node_modules/oxc-config-bridge/bin/oxfmt.js",
  "oxc.path.oxlint": "./node_modules/oxc-config-bridge/bin/oxlint.js"
}
```

Restart the Oxc formatter and linter after changing these settings.

## Requirements and scope

- Node.js 22.18 or newer is required for native TypeScript loading.
- Install Vite 5 or newer and keep a `vite.config.ts` in the project root.
- Install Oxlint 1.77 or newer and Oxfmt 0.62 or newer in the same project.
- The bridge relies on the Vite+ config-loader protocol exposed by those Oxc versions, but does not require a `vite-plus` dependency.
- The unified config must default-export a plain object.

## License

[MIT](./LICENSE)
