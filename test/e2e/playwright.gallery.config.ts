import { defineConfig, devices } from "@playwright/test";
import { getE2EWorkers } from "./playwright-workers";

const GALLERY_PORT = 8100;
const GALLERY_BASE_URL = `http://localhost:${GALLERY_PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "gallery.spec.ts",

  timeout: 60_000,
  expect: { timeout: 15_000 },

  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  workers: getE2EWorkers(),

  outputDir: "test-results/gallery",
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
    url: GALLERY_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 30_000 : 600_000,
    cwd:
      process.env.GITHUB_WORKSPACE ??
      new URL("../..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  },
});
