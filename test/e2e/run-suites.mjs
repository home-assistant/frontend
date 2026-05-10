#!/usr/bin/env node
// Runs each e2e suite (demo, app, gallery) regardless of individual failures,
// then collects and merges blob reports and exits with a non-zero code if any
// suite failed.
//
// Usage: node test/e2e/run-suites.mjs <suite> [<suite> ...]
// Where <suite> matches a test:e2e:<suite> script in package.json,
// e.g. "demo", "app", "gallery", "demo:browserstack", etc.
//
// Using ; or running suites independently avoids the && short-circuit problem
// where a failing suite skips the remaining suites and their blob reports.

import { execFileSync } from "child_process";

const suites = process.argv.slice(2);
if (!suites.length) {
  process.stderr.write("Usage: run-suites.mjs <suite> [<suite> ...]\n");
  process.exit(1);
}

const failures = [];

for (const suite of suites) {
  process.stdout.write(`\n--- Running suite: test:e2e:${suite} ---\n`);
  try {
    execFileSync("yarn", [`test:e2e:${suite}`], { stdio: "inherit" });
  } catch {
    failures.push(suite);
  }
}

// Collect and merge blob reports regardless of suite outcomes.
// (Skipped for browserstack suites — BrowserStack dashboard is the report.)
const isBrowserStack = suites.some((s) => s.includes("browserstack"));
if (!isBrowserStack) {
  execFileSync("node", ["test/e2e/collect-blob-reports.mjs"], {
    stdio: "inherit",
  });
  execFileSync(
    "npx",
    [
      "playwright",
      "merge-reports",
      "-c",
      "test/e2e/playwright.merge.config.ts",
      "test/e2e/reports/blob",
    ],
    { stdio: "inherit" }
  );
}

if (failures.length) {
  process.stderr.write(
    `\nFailed suites: ${failures.map((s) => `test:e2e:${s}`).join(", ")}\n`
  );
  process.exit(1);
}
