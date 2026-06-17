import { defineConfig, devices } from "@playwright/test";

const GALLERY_PORT = 8100;
// When running via the BrowserStack SDK the tunnel maps bs-local.com to
// localhost, so the remote browsers must use bs-local.com as the host.
const GALLERY_BASE_URL = process.env.BROWSERSTACK_AUTOMATION
  ? `http://bs-local.com:${GALLERY_PORT}`
  : `http://localhost:${GALLERY_PORT}`;
// webServer healthcheck always talks to the local process, not via the tunnel.
const GALLERY_LOCAL_URL = `http://localhost:${GALLERY_PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "gallery.spec.ts",

  timeout: 60_000,
  expect: { timeout: 15_000 },

  retries: process.env.CI ? 1 : 0,

  outputDir: "test-results",
  reporter: [["list"], ["blob", { outputDir: "reports/gallery" }]],

  use: {
    baseURL: GALLERY_BASE_URL,
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
      ? `npx serve gallery/dist -p ${GALLERY_PORT} --no-clipboard -s`
      : `./node_modules/.bin/gulp build-gallery && npx serve gallery/dist -p ${GALLERY_PORT} --no-clipboard -s`,
    url: GALLERY_LOCAL_URL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 30_000 : 600_000,
    cwd:
      process.env.GITHUB_WORKSPACE ??
      new URL("../..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  },
});
