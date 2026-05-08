import { defineConfig, devices } from "@playwright/test";
import { browserstackDevices } from "./browserstack.capabilities";

const GALLERY_PORT = 8100;
const GALLERY_BASE_URL = `http://localhost:${GALLERY_PORT}`;

const isBrowserStack = Boolean(process.env.BROWSERSTACK);

function browserstackCdpUrl(caps: Record<string, unknown>): string {
  const encoded = encodeURIComponent(JSON.stringify(caps));
  return `wss://cdp.browserstack.com/playwright?caps=${encoded}`;
}

export default defineConfig({
  testDir: ".",
  testMatch: "gallery.spec.ts",

  timeout: 60_000,
  expect: { timeout: 15_000 },

  retries: process.env.CI ? 1 : 0,

  workers: isBrowserStack ? 5 : undefined,

  outputDir: "test-results",
  reporter: [["list"], ["blob", { outputDir: "reports/gallery" }]],

  use: {
    baseURL: GALLERY_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: isBrowserStack
    ? browserstackDevices.map(({ projectName, caps }) => ({
        name: projectName,
        use: {
          connectOptions: { wsEndpoint: browserstackCdpUrl({ ...caps }) },
          ...(caps.real_mobile
            ? { isMobile: true }
            : { viewport: { width: 1280, height: 800 } }),
        },
      }))
    : [
        {
          name: "local",
          use: { ...devices["Desktop Chrome"] },
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
