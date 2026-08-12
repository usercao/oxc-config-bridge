# Oxc Config Bridge

Use the Vite+ `lint` and `fmt` configuration fields with Oxlint and Oxfmt, without requiring Vite+.

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

Use `--unified-config` to specify a config file explicitly:

```sh
oxc-config-bridge lint --unified-config ./configs/oxc.config.ts .
```

`oxc.config.*` uses the same `lint` and `fmt` fields as Vite+. The bridge resolves it to an absolute path and passes it to the native Oxc CLI. Its short-lived child process supplies the minimal Vite+ config-loader protocol needed for Oxc to read that file. It passes the configuration through unchanged, so Oxlint and Oxfmt retain their native validation and diagnostics. It does not install or start Vite+, create proxy configuration files, or require editor-specific settings.

## Requirements and scope

- Node.js 22.18 or newer is required for native TypeScript loading.
- Install Oxlint 1.77 or newer and Oxfmt 0.62 or newer in the same project.
- The CLI integration relies on the Vite+ config-loader protocol exposed by those versions, but does not require a `vite-plus` dependency.
- The unified config must default-export a plain object.

## License

[MIT](./LICENSE)
