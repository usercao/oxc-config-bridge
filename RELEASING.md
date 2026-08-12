# Releasing

This package publishes through npm Trusted Publishing and GitHub Actions. npm Publishing access is configured to **Require two-factor authentication and disallow tokens**.

Do not add an `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret. The publish workflow uses GitHub OIDC short-lived credentials and automatically generates npm provenance.

## Prerequisites

Before releasing, confirm:

- CI passes on `main`.
- `package.json` contains the intended version.
- `repository.url` still exactly matches `https://github.com/usercao/vite-oxc-bridge`.
- npm Trusted Publisher still authorizes `usercao/vite-oxc-bridge` and `.github/workflows/publish.yml` for `npm publish`.

Run the complete local check:

```sh
npm run check
```

## Publish a release

Choose the correct semantic-version increment:

```sh
npm version patch # or minor / major
git push origin main --follow-tags
```

On GitHub, create and publish a release using the tag created by `npm version`, for example `v0.1.1`.

Publishing the GitHub release triggers `.github/workflows/publish.yml`. The workflow:

- Exchanges GitHub's OIDC identity for a short-lived npm credential.
- Verifies that the release tag equals `v` plus the version in `package.json`.
- Installs dependencies from `package-lock.json`.
- Runs the package test suite through npm lifecycle scripts.
- Publishes to npm with provenance.

If publishing fails with `ENEEDAUTH`, verify the trusted publisher's repository and workflow filename before changing any npm access settings. Do not work around the failure by creating a long-lived automation token.