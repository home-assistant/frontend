import { defineConfig, devices } from "@playwright/test";
import { browserstackDevices } from "./browserstack.capabilities";

// Port 8090 matches the `develop_demo` dev server (rspack-dev-server-demo).
// This means running `demo/script/develop_demo` and then `yarn test:e2e:local`
// works out of the box locally — Playwright will reuse the already-running
// server instead of starting a new one.
// In CI we serve the pre-built demo/dist on the same port.
const DEMO_PORT = 8090;
const DEMO_BASE_URL = `http://localhost:${DEMO_PORT}`;

const isBrowserStack = Boolean(process.env.BROWSERSTACK);

/**
 * Build a BrowserStack CDP WebSocket URL from capability objects.
 * Playwright connects to BrowserStack via their CDP endpoint and passes
 * all capabilities as URL-encoded JSON.
 *
 * Docs: https://www.browserstack.com/docs/automate/playwright/getting-started
 */
function browserstackCdpUrl(caps: Record<string, unknown>): string {
  const encoded = encodeURIComponent(JSON.stringify(caps));
  return `wss://cdp.browserstack.com/playwright?caps=${encoded}`;
}

export default defineConfig({
  // All test files live under test/e2e/
  testDir: ".",
  testMatch: "demo.spec.ts",

  // Give the demo plenty of time to load — especially on real mobile devices
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // Each test gets one retry on CI; locally we fail fast
  retries: process.env.CI ? 1 : 0,

  // BrowserStack recommends no more parallelism than your plan's limit (5).
  // Locally we just use the default (# of CPUs).
  workers: isBrowserStack ? 5 : undefined,

  // Keep all output under test/e2e/ so it sits alongside the tests and
  // is easy to find, gitignore, and upload as a CI artifact.
  outputDir: "test-results",
  reporter: [["list"], ["blob", { outputDir: "reports/demo" }]],

  use: {
    baseURL: DEMO_BASE_URL,
    // Capture trace + screenshot on first retry so failures are easy to debug
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: isBrowserStack
    ? // ── BrowserStack projects ─────────────────────────────────────────────
      browserstackDevices.map(({ projectName, caps }) => ({
        name: projectName,
        use: {
          // Tell Playwright to connect to BrowserStack's remote browser
          // instead of launching a local one.
          connectOptions: {
            wsEndpoint: browserstackCdpUrl({ ...caps }),
          },
          // Use a viewport appropriate for the device type
          ...(caps.real_mobile
            ? { isMobile: true, trace: "off", video: "off" }
            : { viewport: { width: 1280, height: 800 } }),
        },
      }))
    : // ── Local project ─────────────────────────────────────────────────────
      [
        {
          name: "local",
          use: {
            ...devices["Desktop Chrome"],
          },
        },
      ],

  // Serve the demo for tests.
  // - Locally: if `develop_demo` is already running on port 8090, Playwright
  //   reuses it. Otherwise it builds demo/dist and serves it.
  //   Running `develop_demo` first is the recommended local workflow.
  // - In CI: demo/dist is downloaded from the build-demo artifact before this
  //   runs, so we skip the build and go straight to serving.
  webServer: {
    command: process.env.CI
      ? `npx serve demo/dist -p ${DEMO_PORT} --no-clipboard`
      : `./node_modules/.bin/gulp build-demo && npx serve demo/dist -p ${DEMO_PORT} --no-clipboard`,
    url: DEMO_BASE_URL,
    // Reuse the develop_demo dev server if it is already running locally.
    reuseExistingServer: !process.env.CI,
    // Allow up to 5 minutes locally for the demo build + serve startup.
    timeout: process.env.CI ? 30_000 : 300_000,
    // Run from the repo root so `demo/dist` resolves correctly.
    // This config lives at test/e2e/, so two levels up is the repo root.
    cwd:
      process.env.GITHUB_WORKSPACE ??
      new URL("../..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  },
});
