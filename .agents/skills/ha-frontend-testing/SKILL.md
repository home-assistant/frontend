---
name: ha-frontend-testing
description: Home Assistant frontend validation workflow. Use when running lint, TypeScript checks, Vitest, Playwright e2e suites, dev servers, or chart-data benchmarks.
---

# HA Frontend Testing

Use this skill when choosing or running validation for frontend changes.

## Core Commands

```bash
yarn lint          # ESLint + Prettier + TypeScript + Lit
yarn format        # Auto-fix ESLint + Prettier
yarn lint:types    # TypeScript compiler, run without file arguments
yarn test          # Vitest
yarn dev           # App dev server
yarn dev:serve     # Local serving dev server
```

Never run `tsc` or `yarn lint:types` with file arguments. File arguments make `tsc` ignore `tsconfig.json` and can emit `.js` files into `src/`.

For focused type feedback on one file, use editor diagnostics instead of a file-scoped `tsc` command.

## Unit And Utility Tests

- Add or update Vitest tests for data processing, utility code, and behavior that can be tested without a browser.
- Mock WebSocket connections and API calls at boundaries.
- Cover loading, error, unavailable, and missing-entity states where relevant.
- Test accessibility-sensitive behavior when it can be asserted without brittle DOM internals.

## Dev Servers

`yarn dev` builds and watches the app, served by a running Home Assistant core configured through `development_repo`.

`yarn dev:serve` also serves locally and supports `-c` for the core URL and `-p` for the port. Default local serving port is 8124.

Dev server commands support `--background`, `--status`, `--stop`, and `--logs [--follow]`.

## Playwright E2E

Each suite has its own dev server port. Playwright reuses an existing server locally when the port is already running; otherwise it performs a slow full build. The rspack watcher recompiles on save, so reruns should not need a restart.

Start the relevant suite server, then run that suite:

| Suite   | Server                          | Test command            |
| ------- | ------------------------------- | ----------------------- |
| App     | `yarn test:e2e:app:dev` on 8095 | `yarn test:e2e:app`     |
| Demo    | `yarn dev:demo` on 8090         | `yarn test:e2e:demo`    |
| Gallery | `yarn dev:gallery` on 8100      | `yarn test:e2e:gallery` |

Server reuse and `--stop` use the `/__ha_dev_status` health check, so starting or stopping twice is harmless.

Use `-g "<title>" --project=chromium` to narrow a run. `yarn test:e2e` runs all three suites. Run suites directly; piping through output truncation hides progress and failures.

The app suite uses a stripped-down harness for e2e. Demo and gallery use their normal dev servers.

## Benchmarks

For chart data transforms such as history, statistics, energy, and downsampling, follow `test/benchmarks/README.md`.

Use seeded fixtures, characterization snapshot tests, and `yarn test:bench` before and after optimization. Optimizations must keep output bit-identical.

## Verification Selection

- Documentation-only change: no code test required unless examples or commands changed.
- Type-only or utility change: run focused Vitest if available, then `yarn lint:types` if practical.
- Lit component change: run relevant tests plus lint or typecheck depending on scope.
- E2E-sensitive flow: start the relevant e2e dev server and run the narrow Playwright suite.
- Broad refactor: run `yarn lint` and relevant test suites when practical.
