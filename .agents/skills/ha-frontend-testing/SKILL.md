---
name: ha-frontend-testing
description: Home Assistant frontend testing and validation workflow. Use when adding or updating tests, running lint, TypeScript checks, Vitest, Playwright e2e suites, dev servers, or chart-data benchmarks.
---

# HA Frontend Testing

Use this skill when choosing or running validation for frontend changes.

## Test Helpers

- Before adding or changing tests, inspect the relevant suite's existing helpers and fixtures. Reuse them instead of duplicating setup, test data, navigation, interactions, waits, or assertions.
- When the same test flow appears more than once, move it into the closest suite-local helper with a focused interface.
- Keep one-off test behaviour in the test unless a helper makes the intent materially clearer. Do not hide the behaviour under test behind broad, configurable abstractions.

## Core Commands

```bash
yarn lint          # ESLint + Prettier + TypeScript + Lit
yarn format        # Auto-fix ESLint + Prettier
yarn lint:types    # TypeScript compiler, run without file arguments
yarn test          # Vitest
yarn build         # Full production build
yarn dev           # App dev server
yarn dev:serve     # Local serving dev server
```

Never run `tsc` or `yarn lint:types` with file arguments. File arguments make `tsc` ignore `tsconfig.json` and can emit `.js` files into `src/`.

For focused type feedback on one file, use editor diagnostics instead of a file-scoped `tsc` command.

## Production Builds

Production builds support foreground and managed background execution:

```bash
yarn build                         # Full foreground build
yarn build --background            # Full managed background build
yarn build --modern                # Modern frontend_latest bundle only
yarn build --modern --background   # Modern managed background build
yarn build --status
yarn build --logs [--follow]
yarn build --stop
```

Use `yarn build --modern --background` for production bundle-size or browser performance comparisons that only need modern browser output. It runs the normal metadata and static preparation, minifies and compresses the modern `frontend_latest` bundle and shared static assets, and generates modern-only entry pages and service workers. It deliberately skips the legacy bundle and its service worker.

Do not pass `--help`, `--background`, or `--modern` to `script/build_frontend`; that raw script does not parse arguments and always starts the full foreground build. Use `yarn build` for managed builds. App builds and development servers keep exclusive ownership of `hass_frontend/` for their lifetime.

Managed app, demo, gallery, and E2E app workflows share one lifetime lock, so only one build or development server can run at a time.

## When To Add Tests

- Write tests for code that computes something: data processing, utility functions, config validation, and what happens when the user interacts with a component.
- Do not write tests that check what a component looks like: its text, CSS classes, styles, or slots. Do not write tests that check the default value of an option.
- A component that only takes data from contexts and helpers and puts it in a template does not need a test.
- If you are not sure a test is useful, describe the test and what it would catch, and let the user decide.
- Tests never talk to a real Home Assistant. Replace `callWS`, `callApi`, and the connection with fakes.

## Dev Servers

`yarn dev` builds and watches the app, served by a running Home Assistant core configured through `development_repo`.

`yarn dev:serve` also serves locally and supports `-c` for the core URL and `-p` for the port. The default is 8124, or 8123 in a devcontainer.

Dev server commands support `--background`, `--status`, `--stop`, and `--logs [--follow]`. `yarn dev`, `yarn dev:serve`, `yarn dev:demo`, and `yarn dev:gallery` also support `--fetch-translations`; this runs translation fetching, including first-time GitHub device authentication, under the workflow lock before starting the watcher. It works in foreground and background modes. Prefer managed background mode while iterating so the watcher stays available across test runs without occupying the terminal. `yarn dev` and `yarn dev:serve` share one managed process slot because both write the app output.

## Playwright E2E

Each suite has its own dev server port. Playwright reuses an existing server locally when its configured URL responds; otherwise it performs a slow full build. When a development watcher is being reused, rspack recompiles on save and reruns should not need a restart.

Start the relevant suite server, then run that suite:

| Suite   | Background server                            | Test command            |
| ------- | -------------------------------------------- | ----------------------- |
| App     | `yarn test:e2e:app:dev --background` on 8095 | `yarn test:e2e:app`     |
| Demo    | `yarn dev:demo --background` on 8090         | `yarn test:e2e:demo`    |
| Gallery | `yarn dev:gallery --background` on 8100      | `yarn test:e2e:gallery` |

The custom development wrappers use `/__ha_dev_status` to identify and manage their own suites. Playwright server reuse checks the configured URL instead. Wrapper start and stop operations are idempotent for a matching suite and reject an unrelated process occupying the port.

Local runs against a watched development server do not always match CI's clean build artifacts, environment, sharding, or worker configuration. Use background servers for the fast iteration loop, but confirm the relevant CI jobs complete successfully before considering E2E changes verified.

Use `-g "<title>" --project=chromium` to narrow a run. `yarn test:e2e` runs suites sequentially when managed servers are unavailable to prevent cold builds racing over shared generated assets. Run suites directly; piping through output truncation hides progress and failures.

The app suite uses a stripped-down harness for e2e. Demo and gallery use their normal dev servers.

## Benchmarks

For chart data transforms such as history, statistics, energy, and downsampling, read and follow the complete workflow in `test/benchmarks/README.md` before making benchmark or optimization changes.

That workflow owns the baseline, noise analysis, guardrails, acceptance thresholds, and reporting requirements. In particular, optimizations must keep output bit-identical; never update snapshots or modify fixtures to make an optimization pass.

## Verification Selection

- Documentation-only change: no code test required unless examples or commands changed.
- Type-only or utility change: run focused Vitest if available, then `yarn lint:types` if practical.
- Lit component change: run relevant tests plus lint or typecheck depending on scope.
- E2E-sensitive flow: start the relevant e2e dev server and run the narrow Playwright suite.
- Broad refactor: run `yarn lint` and relevant test suites when practical.
