# E2E workflow speed report

Generated on 2026-07-08 from GitHub Actions API data for PR #53057. Refreshed after run #468 completed.

## Method

- PR data source: `.github/workflows/e2e.yaml` runs on branch `e2e-app-perf`.
- Baseline data source: latest comparable completed `.github/workflows/e2e.yaml` run on `dev`, run #460 at `8ee9c95`.
- Workflow wall time is `run_started_at` to `updated_at` for completed workflow runs.
- Job time is job `started_at` to `completed_at`.
- Test step time is the suite's `Run Playwright ... tests` step inside each E2E job.
- Suite details come from downloaded Playwright blob report artifacts.
- Playwright total is the sum of individual test result durations in that suite. It can be greater than wall time because tests run in parallel workers.
- Cases are unique Playwright test cases. Results are Playwright result records, so retries increase the result count.
- In split-suite PR runs, `E2E (local Chromium)` is a short result-gate job, not the original combined test job.
- The `dev` baseline ran app, demo, and gallery inside one combined `E2E (local Chromium)` job. Its suite-specific Playwright totals are available from separate blob report files, but suite-specific E2E job and test-step wall times are not.

## Summary

| Run | Commit | Message | Status | Workflow wall | Delta vs dev baseline |
| --- | --- | --- | --- | ---: | ---: |
| [dev #460](https://github.com/home-assistant/frontend/actions/runs/28937638431) | `8ee9c95` | Fix cloning when drag-sorting a section to the last position (#53050) | success | 10:45 | baseline |
| [PR #463](https://github.com/home-assistant/frontend/actions/runs/28945797547) | `bcb5047` | Run e2e suites in parallel | success | 9:44 | -1:01 (-9.5%) |
| [PR #464](https://github.com/home-assistant/frontend/actions/runs/28947725495) | `54fdab6` | Consolidate app route e2e helpers | success | 11:12 | +0:27 (+4.2%) |
| [PR #465](https://github.com/home-assistant/frontend/actions/runs/28949392723) | `d5652e5` | Move app e2e smoke data out of spec | success | 10:11 | -0:34 (-5.3%) |
| [PR #466](https://github.com/home-assistant/frontend/actions/runs/28950172781) | `8dddd48` | Tighten app e2e smoke timeouts | success | 10:12 | -0:33 (-5.1%) |
| [PR #467](https://github.com/home-assistant/frontend/actions/runs/28951104849) | `eada824` | Split e2e helpers by suite | success | 11:16 | +0:31 (+4.8%) |
| [PR #468](https://github.com/home-assistant/frontend/actions/runs/28952450490) | `e942f9f` | Enable workers and full paralelism to tests. Use 60% for local (4 in my case) and 1 for CI | success | 10:54 | +0:09 (+1.4%) |

Completed PR runs averaged 10:35, which is 0:10 faster than the dev baseline. The median completed PR run was 10:33, which is 0:12 faster than the dev baseline.

## Baseline Run

Baseline: [dev run #460](https://github.com/home-assistant/frontend/actions/runs/28937638431), `8ee9c95`, success.

| Job or step | Time |
| --- | ---: |
| Workflow wall | 10:45 |
| Build gallery job | 2:15 |
| Build demo job | 5:43 |
| Build e2e test app job | 5:26 |
| E2E (local Chromium) job | 4:07 |
| Run Playwright tests (local) step | 3:17 |
| Report job | 0:32 |

## Completed PR Runs

| Run | Commit | Workflow | Build gallery | Build demo | Build app | E2E gallery job/test | E2E demo job/test | E2E app job/test | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [#463](https://github.com/home-assistant/frontend/actions/runs/28945797547) | `bcb5047` | 9:44 | 2:31 | 5:31 | 5:41 | 2:22 / 1:17 | 1:28 / 0:11 | 2:57 / 1:55 | 0:56 |
| [#464](https://github.com/home-assistant/frontend/actions/runs/28947725495) | `54fdab6` | 11:12 | 2:24 | 5:42 | 6:02 | 2:17 / 1:18 | 1:25 / 0:13 | 3:25 / 1:57 | 1:03 |
| [#465](https://github.com/home-assistant/frontend/actions/runs/28949392723) | `d5652e5` | 10:11 | 2:05 | 5:53 | 5:40 | 2:25 / 1:21 | 1:38 / 0:12 | 3:32 / 2:27 | 0:52 |
| [#466](https://github.com/home-assistant/frontend/actions/runs/28950172781) | `8dddd48` | 10:12 | 2:19 | 5:33 | 5:48 | 2:59 / 1:25 | 1:35 / 0:14 | 3:16 / 2:14 | 1:00 |
| [#467](https://github.com/home-assistant/frontend/actions/runs/28951104849) | `eada824` | 11:16 | 2:30 | 4:51 | 6:44 | 2:23 / 1:18 | 1:22 / 0:12 | 3:01 / 1:59 | 0:57 |
| [#468](https://github.com/home-assistant/frontend/actions/runs/28952450490) | `e942f9f` | 10:54 | 2:24 | 5:55 | 5:42 | 3:18 / 2:01 | 1:35 / 0:15 | 4:14 / 3:10 | 0:47 |

## Suite Runs

### App Suite

| Run | Commit | Build | E2E job | Test step | Cases | Results | Playwright total | Chromium total | Mobile total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [dev #460](https://github.com/home-assistant/frontend/actions/runs/28937638431) | `8ee9c95` | 5:26 | combined 4:07 | combined 3:17 | 202 | 202 | 3:28 | 1:43 | 1:45 |
| [PR #463](https://github.com/home-assistant/frontend/actions/runs/28945797547) | `bcb5047` | 5:41 | 2:57 | 1:55 | 202 | 202 | 3:33 | 1:46 | 1:47 |
| [PR #464](https://github.com/home-assistant/frontend/actions/runs/28947725495) | `54fdab6` | 6:02 | 3:25 | 1:57 | 202 | 202 | 3:37 | 1:49 | 1:49 |
| [PR #465](https://github.com/home-assistant/frontend/actions/runs/28949392723) | `d5652e5` | 5:40 | 3:32 | 2:27 | 240 | 241 | 4:26 | 2:18 | 2:08 |
| [PR #466](https://github.com/home-assistant/frontend/actions/runs/28950172781) | `8dddd48` | 5:48 | 3:16 | 2:14 | 240 | 240 | 4:09 | 2:03 | 2:05 |
| [PR #467](https://github.com/home-assistant/frontend/actions/runs/28951104849) | `eada824` | 6:44 | 3:01 | 1:59 | 240 | 240 | 3:38 | 1:48 | 1:50 |
| [PR #468](https://github.com/home-assistant/frontend/actions/runs/28952450490) | `e942f9f` | 5:42 | 4:14 | 3:10 | 240 | 240 | 3:00 | 1:29 | 1:31 |

Slowest app tests in the latest completed run:

| Project | Test | Duration |
| --- | --- | ---: |
| mobile-chrome | Panel URL normalization > keeps the lovelace panel when removing the edit query | 0:02 |
| chromium | Panel URL normalization > keeps the lovelace panel when removing the edit query | 0:01 |
| chromium | Panel URL normalization > keeps the lovelace panel when adding the edit query | 0:01 |

### Demo Suite

| Run | Commit | Build | E2E job | Test step | Cases | Results | Playwright total | Chromium total | Mobile total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [dev #460](https://github.com/home-assistant/frontend/actions/runs/28937638431) | `8ee9c95` | 5:43 | combined 4:07 | combined 3:17 | 8 | 8 | 0:12 | 0:06 | 0:06 |
| [PR #463](https://github.com/home-assistant/frontend/actions/runs/28945797547) | `bcb5047` | 5:31 | 1:28 | 0:11 | 8 | 8 | 0:13 | 0:06 | 0:07 |
| [PR #464](https://github.com/home-assistant/frontend/actions/runs/28947725495) | `54fdab6` | 5:42 | 1:25 | 0:13 | 8 | 8 | 0:13 | 0:06 | 0:07 |
| [PR #465](https://github.com/home-assistant/frontend/actions/runs/28949392723) | `d5652e5` | 5:53 | 1:38 | 0:12 | 8 | 8 | 0:13 | 0:06 | 0:07 |
| [PR #466](https://github.com/home-assistant/frontend/actions/runs/28950172781) | `8dddd48` | 5:33 | 1:35 | 0:14 | 8 | 8 | 0:11 | 0:05 | 0:06 |
| [PR #467](https://github.com/home-assistant/frontend/actions/runs/28951104849) | `eada824` | 4:51 | 1:22 | 0:12 | 8 | 8 | 0:13 | 0:06 | 0:07 |
| [PR #468](https://github.com/home-assistant/frontend/actions/runs/28952450490) | `e942f9f` | 5:55 | 1:35 | 0:15 | 8 | 8 | 0:09 | 0:04 | 0:05 |

Slowest demo tests in the latest completed run:

| Project | Test | Duration |
| --- | --- | ---: |
| mobile-chrome | Home Assistant Demo > sidebar navigation changes the active panel | 0:02 |
| mobile-chrome | Home Assistant Demo > clicking an entity card opens the more-info dialog | 0:01 |
| mobile-chrome | Home Assistant Demo > dashboard renders Lovelace cards | 0:01 |

### Gallery Suite

| Run | Commit | Build | E2E job | Test step | Cases | Results | Playwright total | Chromium total | Mobile total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [dev #460](https://github.com/home-assistant/frontend/actions/runs/28937638431) | `8ee9c95` | 2:15 | combined 4:07 | combined 3:17 | 166 | 166 | 2:14 | 1:04 | 1:10 |
| [PR #463](https://github.com/home-assistant/frontend/actions/runs/28945797547) | `bcb5047` | 2:31 | 2:22 | 1:17 | 166 | 166 | 2:16 | 1:06 | 1:10 |
| [PR #464](https://github.com/home-assistant/frontend/actions/runs/28947725495) | `54fdab6` | 2:24 | 2:17 | 1:18 | 166 | 166 | 2:18 | 1:06 | 1:12 |
| [PR #465](https://github.com/home-assistant/frontend/actions/runs/28949392723) | `d5652e5` | 2:05 | 2:25 | 1:21 | 166 | 166 | 2:22 | 1:09 | 1:13 |
| [PR #466](https://github.com/home-assistant/frontend/actions/runs/28950172781) | `8dddd48` | 2:19 | 2:59 | 1:25 | 166 | 166 | 2:29 | 1:12 | 1:17 |
| [PR #467](https://github.com/home-assistant/frontend/actions/runs/28951104849) | `eada824` | 2:30 | 2:23 | 1:18 | 166 | 166 | 2:18 | 1:07 | 1:12 |
| [PR #468](https://github.com/home-assistant/frontend/actions/runs/28952450490) | `e942f9f` | 2:24 | 3:18 | 2:01 | 166 | 166 | 1:52 | 0:54 | 0:57 |

Slowest gallery tests in the latest completed run:

| Project | Test | Duration |
| --- | --- | ---: |
| mobile-chrome | Component interactions > ha-alert renders all four types | 0:10 |
| chromium | Component interactions > ha-alert renders all four types | 0:10 |
| mobile-chrome | Component interactions > ha-form renders schema-driven fields | 0:01 |

## Observations

- The fastest completed PR run was #463 at 9:44, 1:01 faster than the dev baseline.
- The latest completed PR run was #468 at 10:54, 0:09 slower than the dev baseline.
- The completed PR runs varied from 9:44 to 11:16, so single-run comparisons are noisy.
- The app suite did not lose test cases in completed runs. It grew from 202 cases in the baseline and first PR runs to 240 cases in #465 onward.
- Across all suites, completed runs went from 376 total cases in the baseline and first PR runs to 414 total cases in #465 onward.
- The app test step improved through #467, then regressed in #468: 1:55, 1:57, 2:27, 2:14, 1:59, then 3:10.
- The #468 app Playwright total is the lowest measured app total at 3:00, but the app test-step wall time is the slowest at 3:10. That points to suite-level wall-clock overhead or worker behavior rather than slower individual test bodies.
- App build time recovered in #468 from 6:44 to 5:42, but the app E2E job increased from 3:01 to 4:14.
- Build and app-suite time dominate the critical path. Demo and gallery test steps are small after their builds are available.
- The split workflow adds a report merge job of roughly 0:52 to 1:03 after suite completion.
- The local branch has an additional unpushed commit, `f4f03330e` (`Consolidate app e2e smoke data`), so there is no GitHub Actions run for that commit in the PR data.
