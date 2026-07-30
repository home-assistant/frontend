# Build size comparison: old vs new `.browserslistrc`

Both builds were produced on the `pass-browser-list` branch (which passes the browserslist
config through to rspack/SWC and Lightning CSS), so the **only difference between the two
builds is the `.browserslistrc` content**:

- **Old** = `.browserslistrc` as committed at HEAD (`aa02a1117`)
- **New** = the staged `.browserslistrc` on this branch

Both full production builds (`yarn build` → `gulp build-app`) took ~18 min.

## Resolved browser targets

| Env       | Old          | New          |
| --------- | ------------ | ------------ |
| modern    | 75 browsers  | 124 browsers |
| legacy    | 424 browsers | 181 browsers |
| legacy-sw | 422 browsers | 181 browsers |

Key minimum versions per env:

| Browser          | modern old | modern new | legacy old | legacy new |
| ---------------- | ---------- | ---------- | ---------- | ---------- |
| Chrome           | 109        | 128        | 39         | 79         |
| Edge             | 139        | 128        | 79         | 92         |
| Firefox          | 140 (ESR)  | 129        | 69         | 78         |
| Safari           | 26.0       | 17.6       | 13         | 13.1       |
| iOS Safari       | 18.5       | 17.6       | 11.0       | 13.2       |
| Samsung Internet | 29         | 27         | 10.1       | 24         |

The new modern list (`last 2 years`) _lowers_ the Safari/Firefox floor but _raises_ the
Chrome floor (the old `>= 0.5%` rule kept Chrome 109 alive). The new legacy list
(`last 7 years and >= 0.001%`, intersection instead of union) raises the floor across the
board — that is where the size win comes from.

## Total JS output size

All `.js` files in the output directory; gzip is `gzip -9` recomputed per file, brotli is
the `.js.br` files the build itself emits (what is actually served).

### `frontend_latest` (modern build)

| Metric        | Old       | New       | Δ                  |
| ------------- | --------- | --------- | ------------------ |
| Raw JS        | 31.97 MiB | 31.89 MiB | −86.7 KiB (−0.3%)  |
| Gzip          | 9.50 MiB  | 9.46 MiB  | −39.5 KiB (−0.4%)  |
| Brotli        | 8.16 MiB  | 8.13 MiB  | −33.6 KiB (−0.4%)  |
| Sourcemaps    | 28.18 MiB | 28.06 MiB | −126.8 KiB (−0.4%) |
| JS file count | 1099      | 1096      | −3                 |

### `frontend_es5` (legacy build)

| Metric        | Old       | New       | Δ                      |
| ------------- | --------- | --------- | ---------------------- |
| Raw JS        | 35.31 MiB | 31.74 MiB | **−3.57 MiB (−10.1%)** |
| Gzip          | 9.62 MiB  | 9.38 MiB  | −249.0 KiB (−2.5%)     |
| Brotli        | 8.13 MiB  | 8.03 MiB  | −100.0 KiB (−1.2%)     |
| Sourcemaps    | 32.05 MiB | 28.16 MiB | −3.89 MiB (−12.1%)     |
| JS file count | 1151      | 1138      | −13                    |

Total `hass_frontend/` on disk: 260.9 MiB → 252.7 MiB (−8.2 MiB).

## Cold-load critical entrypoints (raw initial JS)

These are the budget-tracked entrypoints from `build-scripts/check-bundle-size.cjs`
(downloaded before anything interactive happens).

### Modern

| Entrypoint   | Old       | New       | Δ                |
| ------------ | --------- | --------- | ---------------- |
| app          | 542.0 KiB | 537.3 KiB | −4.8 KiB (−0.9%) |
| core         | 52.4 KiB  | 50.2 KiB  | −2.2 KiB (−4.2%) |
| authorize    | 520.7 KiB | 514.7 KiB | −6.0 KiB (−1.2%) |
| onboarding   | 620.0 KiB | 613.0 KiB | −7.0 KiB (−1.1%) |
| custom-panel | 63.3 KiB  | 61.1 KiB  | −2.2 KiB (−3.5%) |

### Legacy

| Entrypoint   | Old       | New       | Δ                       |
| ------------ | --------- | --------- | ----------------------- |
| app          | 822.5 KiB | 632.6 KiB | **−189.8 KiB (−23.1%)** |
| core         | 229.0 KiB | 158.2 KiB | **−70.8 KiB (−30.9%)**  |
| authorize    | 795.9 KiB | 617.1 KiB | −178.9 KiB (−22.5%)     |
| onboarding   | 939.3 KiB | 722.7 KiB | −216.6 KiB (−23.1%)     |
| custom-panel | 174.1 KiB | 106.9 KiB | **−67.2 KiB (−38.6%)**  |

## Takeaways

- **The modern build barely changes** (≈−0.4% across the board). Trading the old
  usage-based floor for a clean `last 2 years` rule is roughly size-neutral: the lower
  Safari floor costs a little, the higher Chrome floor saves a little more.
- **The legacy build shrinks substantially**: −10% raw JS and −23% to −39% on the
  cold-load entrypoints, because raising the floor (Chrome 39→79, Samsung 10→24,
  iOS 11→13.2) drops a large amount of transpilation output and polyfills.
- Over the wire the legacy win is smaller (−2.5% gzip / −1.2% brotli) since transpilation
  boilerplate compresses very well — but parse/execute cost on the (typically slow)
  devices that receive the legacy build scales with the raw size, so the −10% still
  matters where it hurts most.
- The legacy entrypoints land well under the current `build-scripts/bundle-budget.json`
  budgets; those could be re-seeded (`node build-scripts/check-bundle-size.cjs --update
--headroom=3`) once this browserslist change is final.

## Method

1. `yarn build` with the staged (new) `.browserslistrc`; recorded per-file raw and
   `gzip -9` sizes of `hass_frontend/frontend_latest` + `frontend_es5` and the rspack
   stats (`build/stats/frontend-{modern,legacy}.json`).
2. Restored the HEAD (old) `.browserslistrc`, rebuilt, recorded the same.
3. Restored the staged file. Entrypoint sizes are the initial entry-chunk JS as computed
   by the same logic as `check-bundle-size.cjs`. Translations/static assets are identical
   between builds and excluded from the JS numbers. The root service-worker files
   (`sw-modern.js`, `sw-legacy.js`) were not compared separately.
