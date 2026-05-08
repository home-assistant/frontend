/**
 * BrowserStack device/browser capability matrix for e2e tests.
 *
 * Each entry maps to a named Playwright project in playwright.demo.config.ts.
 * Keep the total number of entries at or below the BrowserStack parallel
 * test limit for this account (5 parallel tests).
 *
 * Capability reference:
 * https://www.browserstack.com/docs/automate/playwright/browsers-and-os
 */

export interface BrowserStackCapabilities {
  "browserstack.username": string;
  "browserstack.accessKey": string;
  "browserstack.local": boolean;
  "browserstack.localIdentifier": string;
  browser: string;
  browser_version?: string;
  os?: string;
  os_version: string;
  device?: string;
  real_mobile?: boolean;
  name: string;
  build: string;
  project: string;
}

const build = process.env.GITHUB_RUN_ID
  ? `CI #${process.env.GITHUB_RUN_ID}`
  : "local";

const localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER ?? "default";

const base: Omit<
  BrowserStackCapabilities,
  "browser" | "os_version" | "name" | "device" | "real_mobile" | "os"
> = {
  "browserstack.username": process.env.BROWSERSTACK_USERNAME ?? "",
  "browserstack.accessKey": process.env.BROWSERSTACK_ACCESS_KEY ?? "",
  "browserstack.local": true,
  "browserstack.localIdentifier": localIdentifier,
  build,
  project: "Home Assistant Demo e2e",
};

export interface DeviceConfig {
  /** Name used for the Playwright project (must be unique). */
  projectName: string;
  caps: BrowserStackCapabilities;
}

export const browserstackDevices: DeviceConfig[] = [
  // ── Desktop ──────────────────────────────────────────────────────────────
  {
    projectName: "browserstack-chrome-win10",
    caps: {
      ...base,
      browser: "chrome",
      browser_version: "latest",
      os: "Windows",
      os_version: "10",
      name: "Chrome latest / Windows 10",
    },
  },
  {
    projectName: "browserstack-firefox-macos",
    caps: {
      ...base,
      browser: "firefox",
      browser_version: "latest",
      os: "OS X",
      os_version: "Ventura",
      name: "Firefox latest / macOS Ventura",
    },
  },
  // ── Mobile ───────────────────────────────────────────────────────────────
  {
    projectName: "browserstack-safari-ipad-ios12",
    caps: {
      ...base,
      browser: "safari",
      os_version: "12",
      device: "iPad 6th",
      real_mobile: true,
      name: "Safari / iPad 6th gen / iOS 12",
    },
  },
  {
    projectName: "browserstack-safari-iphone-ios14",
    caps: {
      ...base,
      browser: "safari",
      os_version: "14",
      device: "iPhone 12",
      real_mobile: true,
      name: "Safari / iPhone 12 / iOS 14",
    },
  },
  {
    projectName: "browserstack-chrome-android8",
    caps: {
      ...base,
      browser: "chrome",
      os_version: "8.0",
      device: "Samsung Galaxy S9",
      real_mobile: true,
      name: "Chrome / Samsung Galaxy S9 / Android 8",
    },
  },
];
