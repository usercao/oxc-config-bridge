# Oxc Config Bridge

This package provides one type-safe, hand-written configuration source for Oxlint and Oxfmt without relying on Vite+ or the private `VP_VERSION` integration.

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
    "lint": "oxc-config-bridge lint ."
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

The bridge searches the current directory and its parents for `oxc.config.ts`, `.mts`, `.cts`, `.js`, `.mjs`, or `.cjs`. Use `--unified-config` to select a file explicitly.

```sh
oxc-config-bridge lint --deny-warnings .
oxc-config-bridge fmt --check .
oxc-config-bridge fmt .
```

Each command creates a unique proxy configuration beside the bridge config, starts the corresponding native CLI with `--config`, forwards its arguments and exit code, and removes the proxy afterward. Keeping the proxy beside `oxc.config.*` preserves the base directory used by relative paths and glob patterns.

Passing the native `-c` or `--config` option through `lint` or `fmt` is rejected because it would conflict with the generated proxy. Use `--unified-config` instead:

```sh
oxc-config-bridge lint --unified-config ./configs/oxc.config.ts .
```

## Editors

Generate stable proxies for the official Oxc VS Code extension:

```sh
oxc-config-bridge prepare
```

By default, the proxies are written beside `oxc.config.*` to preserve the base directory for relative configuration paths. A repository can keep them in a dedicated tooling directory when its editor configuration does not depend on relative glob, plugin, or Tailwind paths:

```sh
oxc-config-bridge prepare --output-dir ./.config/oxc
```

For the default output directory, point the extension at the generated root proxies:

```jsonc
{
  "oxc.configPath": "./.oxc-bridge.oxlint.generated.mjs",
  "oxc.fmt.configPath": "./.oxc-bridge.oxfmt.generated.mjs",
}
```

The generated files are implementation details and should be ignored by version control. Pass the same `--output-dir` to `clean` when using a custom directory. Run `prepare` again after moving or renaming the unified configuration file.

The official Oxc extension does not discover this bridge's unified `oxc.config.*` shape or read package-provided VS Code settings. Consumer projects must therefore set `oxc.configPath` and `oxc.fmt.configPath` to the generated proxies. These workspace settings cannot be moved into this npm package because VS Code only reads them from the consuming workspace or the user's global settings.

## Requirements and scope

- Node.js 22.18 or newer is required for native TypeScript loading.
- `oxlint` and `oxfmt` are peer dependencies and remain the source of configuration validation.
- The unified config must default-export a plain object. Function and Promise exports are intentionally unsupported.
- Nested unified configs are discovered by the wrapper CLI. Editor behavior is controlled by the two explicit generated config paths.

## License

[MIT](./LICENSE)
