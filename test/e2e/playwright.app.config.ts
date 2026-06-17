import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 8095;
// When running via the BrowserStack SDK the tunnel maps bs-local.com to
// localhost, so the remote browsers must use bs-local.com as the host.
const APP_BASE_URL = process.env.BROWSERSTACK_AUTOMATION
  ? `http://bs-local.com:${APP_PORT}`
  : `http://localhost:${APP_PORT}`;
// webServer healthcheck always talks to the local process, not via the tunnel.
const APP_LOCAL_URL = `http://localhost:${APP_PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "app.spec.ts",

  timeout: 60_000,
  expect: { timeout: 15_000 },

  retries: process.env.CI ? 1 : 0,

  outputDir: "test-results",
  reporter: [["list"], ["blob", { outputDir: "reports/app" }]],

  use: {
    baseURL: APP_BASE_URL,
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

  webServer: {
    command: process.env.CI
      ? `npx serve test/e2e/app/dist -p ${APP_PORT} --no-clipboard -s`
      : `./node_modules/.bin/gulp build-e2e-test-app && npx serve test/e2e/app/dist -p ${APP_PORT} --no-clipboard -s`,
    url: APP_LOCAL_URL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 30_000 : 600_000,
    cwd:
      process.env.GITHUB_WORKSPACE ??
      new URL("../..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  },
});
