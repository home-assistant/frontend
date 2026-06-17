import { defineConfig, devices } from "@playwright/test";

// Port 8090 matches the `develop_demo` dev server (rspack-dev-server-demo).
// This means running `demo/script/develop_demo` and then `yarn test:e2e:local`
// works out of the box locally — Playwright will reuse the already-running
// server instead of starting a new one.
// In CI we serve the pre-built demo/dist on the same port.
const DEMO_PORT = 8090;
// When running via the BrowserStack SDK the tunnel maps bs-local.com to
// localhost, so the remote browsers must use bs-local.com as the host.
const DEMO_BASE_URL = process.env.BROWSERSTACK_AUTOMATION
  ? `http://bs-local.com:${DEMO_PORT}`
  : `http://localhost:${DEMO_PORT}`;
// webServer healthcheck always talks to the local process, not via the tunnel.
const DEMO_LOCAL_URL = `http://localhost:${DEMO_PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "demo.spec.ts",

  timeout: 60_000,
  expect: { timeout: 15_000 },

  retries: process.env.CI ? 1 : 0,

  outputDir: "test-results",
  reporter: [["list"], ["blob", { outputDir: "reports/demo" }]],

  use: {
    baseURL: DEMO_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
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
    url: DEMO_LOCAL_URL,
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
