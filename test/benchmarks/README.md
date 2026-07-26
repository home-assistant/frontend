# Chart data processing benchmarks

This directory contains benchmarks and an optimization playbook for the
frontend's chart data processing: the code that sanitizes, downsamples, and
transforms history/statistics/energy data for visualization. This data can be
large (weeks of 5-minute statistics, 100k+ state histories) and refreshes
often, so this processing should put as little load as possible on client
devices.

The harness has three parts:

1. **Deterministic fixtures** (`test/fixtures/`) — seeded generators for
   history states, statistics, and energy data. The same seed always produces
   the same payload.
2. **Characterization tests** — snapshot tests that pin the _exact current
   output_ of every transform (see the target map below). They are the
   correctness contract for optimization work: a performance change must
   leave all outputs bit-identical.
3. **Benchmarks** (this directory) — `vitest bench` suites over the same
   fixtures, runnable with machine-readable output for baseline comparison.

## Running

```bash
yarn test:bench                          # run all benchmarks
yarn test:bench down-sample              # run one suite

# Record a baseline, then compare after a change:
yarn test:bench --outputJson test/benchmarks/results/baseline.json
yarn test:bench --compare test/benchmarks/results/baseline.json --outputJson test/benchmarks/results/after.json
```

`test/benchmarks/results/` is gitignored. The JSON reports include `hz`,
`mean`, `rme` (relative margin of error), and percentiles per benchmark;
compare mode also prints the delta next to each result.

Benchmarks run in a plain node environment (`test/vitest.bench.config.ts`)
with sequential files for stable timings. Expect run-to-run noise of a few
percent; always record the baseline twice and check `rme` before drawing
conclusions.

## Optimization target map

| Transform                                                                       | Source                                                            | Benchmark                                | Characterization test                                                   |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `downSampleLineData`                                                            | `src/components/chart/down-sample.ts`                             | `down-sample.bench.ts`                   | `test/components/chart/down-sample.test.ts`                             |
| `computeHistory`                                                                | `src/data/history.ts`                                             | `history.bench.ts`                       | `test/data/history-characterization.test.ts`                            |
| `HistoryStream.processMessage`                                                  | `src/data/history.ts`                                             | `history-stream.bench.ts`                | `test/data/history-characterization.test.ts`                            |
| `convertStatisticsToHistory`, `mergeHistoryResults`                             | `src/data/history.ts`                                             | `statistics.bench.ts`                    | `test/data/history-characterization.test.ts`                            |
| `generateStatisticsChartData`                                                   | `src/components/chart/statistics-chart-data.ts`                   | `statistics-chart-data.bench.ts`         | `test/components/chart/statistics-chart-data.test.ts`                   |
| `generateStateHistoryChartLineData`                                             | `src/components/chart/state-history-chart-line-data.ts`           | `state-history-chart-line-data.bench.ts` | `test/components/chart/state-history-chart-line-data.test.ts`           |
| `fillDataGapsAndRoundCaps`                                                      | `src/components/chart/round-caps.ts`                              | `chart-helpers.bench.ts`                 | `test/panels/lovelace/cards/energy/common/energy-chart-options.test.ts` |
| `computeYAxisFractionDigits`                                                    | `src/components/chart/y-axis-fraction-digits.ts`                  | `chart-helpers.bench.ts`                 | `test/components/chart/y-axis-fraction-digits.test.ts`                  |
| `getSummedData`, `computeConsumptionData`, `computeConsumptionSingle`           | `src/data/energy.ts`                                              | `energy.bench.ts`                        | `test/data/energy-characterization.test.ts`                             |
| `fillLineGaps`, `computeStatMidpoint`, `getCompareTransform`, `getSuggestedMax` | `src/panels/lovelace/cards/energy/common/energy-chart-options.ts` | `energy.bench.ts`                        | `test/panels/lovelace/cards/energy/common/energy-chart-options.test.ts` |

Call frequency notes (what makes a target worth optimizing):

- `computeHistory` runs on **every history stream message** for every visible
  history graph card; `HistoryStream.processMessage` merges and purges on the
  same cadence.
- `downSampleLineData` runs in `ha-chart-base._getSeries()` on **every chart
  render** of every chart on screen.
- `generateStatisticsChartData` / `generateStateHistoryChartLineData` run on
  every data or config change of their charts (`MIN_TIME_BETWEEN_UPDATES` =
  5 minutes keeps charts refreshing even without new data).
- `getSummedData` / `computeConsumptionData` run per energy collection update
  and feed most cards on the energy dashboard. Both are `memoizeOne`-wrapped:
  benchmarks must pass a fresh object reference per iteration or they only
  measure the cache hit.

### Not yet extracted (refactor before optimizing)

The energy graph cards still embed their series generation in the Lit
component (`_processDataSet`, `_processTotal`, `_processStatistics`,
`_processForecast`, `_processUntracked`):

- `src/panels/lovelace/cards/energy/hui-energy-usage-graph-card.ts`
- `src/panels/lovelace/cards/energy/hui-energy-solar-graph-card.ts`
- `src/panels/lovelace/cards/energy/hui-energy-devices-detail-graph-card.ts`
- `src/panels/lovelace/cards/energy/hui-energy-gas-graph-card.ts`
- `src/panels/lovelace/cards/energy/hui-energy-water-graph-card.ts`
- `src/panels/lovelace/cards/energy/hui-power-sources-graph-card.ts`

To optimize one of these, first repeat the extraction pattern used for
`statistics-chart-data.ts` / `state-history-chart-line-data.ts`:

1. Move the processing methods into a pure module next to the card, taking an
   options object. Inject every environment read: `hass` (or the narrow
   pieces used), `getComputedStyle(this)` results, and `new Date()` as a
   `now: Date` parameter. **Zero logic changes** — this commit must be a
   mechanical move reviewable side-by-side.
2. Add characterization tests for the extracted function using the
   `test/fixtures/` generators (snapshot small inputs, `digestResult` large
   ones) and a benchmark file here.
3. Only then optimize, following the loop below.

## The optimization loop

Work on **one target at a time**:

1. **Preflight** — `yarn test` must be green before you start.
2. **Coverage check** — confirm the target has characterization coverage for
   the code paths you will touch; add missing cases in a separate commit
   _before_ changing the implementation.
3. **Baseline** — run `yarn test:bench --outputJson .../baseline.json`
   **twice**; note the `rme` and the spread between runs. That spread is your
   noise floor.
4. **Optimize** — change the implementation. Stay within the guardrails
   below.
5. **Verify correctness** — `yarn test` and `yarn lint` must pass. Never run
   `yarn lint:types` with file arguments.
6. **Measure** — `yarn test:bench --compare .../baseline.json --outputJson
.../after.json`.
7. **Report** — include a before/after table (`mean`, `hz`, `rme`) for every
   affected benchmark, generated from the two JSON files.

### Guardrails

- **Outputs must be bit-identical.** Never run vitest with `-u`/`--update`;
  never edit files under `__snapshots__/` or `test/fixtures/`; never modify
  existing characterization tests (adding new cases is fine, in its own
  commit). Even a change in floating-point summation order is a behavior
  change. If an optimization seems to require changing the output, stop and
  escalate with a written justification instead.
- **No public API changes.** Exported function signatures and component
  properties stay as they are.
- **No new runtime dependencies.**
- **Bundle size matters.** This code ships to browsers and CI tracks bundle
  stats; keep added source small.
- **Strategy preference, in order:**
  1. Algorithmic: single-pass loops, avoiding repeated full reprocessing per
     message, avoiding intermediate allocations.
  2. Memoization: `memoize-one` is already a dependency; only useful when
     inputs are reference-stable across calls.
  3. Incremental/delta processing: reuse the previous result when only new
     data arrived (e.g. history stream updates).
  4. Web workers: an architecture change — propose it with measurements, do
     not implement it as part of a routine optimization pass.

### Acceptance criteria

An optimization is accepted only if **all** of the following hold:

- `yarn test` fully green and `yarn lint` clean.
- `git diff` contains no changes under `test/fixtures/`, `__snapshots__/`,
  or existing characterization tests.
- The declared target improves by **≥ 10% mean time**, and the improvement is
  larger than 3× the combined `rme` of the baseline and after runs.
- No other benchmark regresses by more than max(5%, 2× its `rme`).
- No new dependencies and no public export changes.
- The report includes the before/after table described above.

## Fixture conventions

- All fixtures are seeded (`test/fixtures/random.ts`, mulberry32); identical
  seeds yield identical data. Scale tiers: `SCALES = { small: 1k, medium:
10k, large: 100k }` total states.
- Everything is anchored at `FIXED_EPOCH_MS` (2024-01-01T00:00:00Z) **except**
  `HistoryStream` scenarios: the stream purges against `Date.now()`, so its
  fixtures take a `startMs` derived from the current time. Characterization
  tests pin the clock with `vi.useFakeTimers()`; benchmarks use the real
  `Date.now()` at module load (tinybench needs a real clock — never fake
  timers in a benchmark).
- Large outputs are snapshotted via `digestResult()` (`test/fixtures/digest.ts`),
  a structural checksum that stays small but catches numeric drift.
