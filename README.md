# Oxc Config Bridge

Type-safe unified config for Oxlint and Oxfmt.

## Installation

```sh
npm install --save-dev oxc-config-bridge oxlint oxfmt
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

```ts
// oxc.config.ts
import { defineConfig } from 'oxc-config-bridge'

export default defineConfig({
  oxlint: {
    rules: {
      'no-debugger': 'deny',
    },
  },
  oxfmt: {
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

Use `--unified-config` to specify a config file explicitly:

```sh
oxc-config-bridge lint --unified-config ./configs/oxc.config.ts .
```

## Editors

Generate stable native config files for editor integrations:

```sh
oxc-config-bridge prepare --output-dir ./.config/oxc
```

Point the extension at those files in `.vscode/settings.json`:

```jsonc
{
  "oxc.configPath": "./.config/oxc/.oxc-bridge.oxlint.generated.mjs",
  "oxc.fmt.configPath": "./.config/oxc/.oxc-bridge.oxfmt.generated.mjs",
}
```

Ignore the generated directory:

```gitignore
.config/oxc/
```

Run `prepare` again after changing the unified config path.

## Requirements and scope

- Node.js 22.18 or newer is required for native TypeScript loading.
- Install `oxlint` and `oxfmt` in the same project.
- The unified config must default-export a plain object.

## License

[MIT](./LICENSE)
