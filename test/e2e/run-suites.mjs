#!/usr/bin/env node
// Runs each e2e suite (demo, app, gallery) regardless of individual failures,
// then collects and merges blob reports locally and exits with a non-zero code
// if any suite failed.
//
// Usage: node test/e2e/run-suites.mjs <suite> [<suite> ...]
// Where <suite> matches a test:e2e:<suite> script in package.json,
// e.g. "demo", "app", "gallery".
//
// Running suites independently avoids the && short-circuit problem where a
// failing suite skips the remaining suites and their blob reports.
// Set E2E_WORKERS to a number or percentage to override local workers.

import { execFileSync, spawn } from "child_process";

const TRUE_VALUES = new Set(["1", "true", "yes"]);

const isTruthy = (value) => TRUE_VALUES.has(value?.toLowerCase() ?? "");

const formatDuration = (ms) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const writePrefixed = (suite, stream, chunk, pending) => {
  const lines = `${pending.value}${chunk}`.split(/\r?\n/);
  pending.value = lines.pop() ?? "";
  for (const line of lines) {
    stream.write(`[${suite}] ${line}\n`);
  }
};

const flushPrefixed = (suite, stream, pending) => {
  if (!pending.value) return;
  stream.write(`[${suite}] ${pending.value}\n`);
  pending.value = "";
};

const runSuite = (suite, env) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("yarn", [`test:e2e:${suite}`], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
    const pendingStdout = { value: "" };
    const pendingStderr = { value: "" };
    const workerLabel = env.E2E_WORKERS ? ` (workers: ${env.E2E_WORKERS})` : "";

    process.stdout.write(
      `\n--- Running suite: test:e2e:${suite}${workerLabel} ---\n`
    );

    child.stdout.on("data", (chunk) =>
      writePrefixed(suite, process.stdout, chunk, pendingStdout)
    );
    child.stderr.on("data", (chunk) =>
      writePrefixed(suite, process.stderr, chunk, pendingStderr)
    );

    child.on("error", (err) => {
      flushPrefixed(suite, process.stdout, pendingStdout);
      flushPrefixed(suite, process.stderr, pendingStderr);
      process.stderr.write(`[${suite}] Failed to start: ${err.message}\n`);
      resolve({ suite, code: 1, duration: Date.now() - started });
    });

    child.on("close", (code) => {
      flushPrefixed(suite, process.stdout, pendingStdout);
      flushPrefixed(suite, process.stderr, pendingStderr);
      const duration = Date.now() - started;
      process.stdout.write(
        `--- Finished suite: test:e2e:${suite} (${formatDuration(duration)}) ---\n`
      );
      resolve({ suite, code: code ?? 1, duration });
    });
  });

const suites = process.argv.slice(2);
if (!suites.length) {
  process.stderr.write("Usage: run-suites.mjs <suite> [<suite> ...]\n");
  process.exit(1);
}

const sequential = isTruthy(process.env.E2E_SEQUENTIAL);
const skipMerge = isTruthy(process.env.E2E_SKIP_MERGE);
const suiteWorkers =
  !sequential &&
  !process.env.CI &&
  !process.env.E2E_WORKERS &&
  suites.length > 1
    ? `${Math.max(1, Math.floor(60 / suites.length))}%`
    : undefined;
const suiteEnv = suiteWorkers
  ? { ...process.env, E2E_WORKERS: suiteWorkers }
  : process.env;

const results = [];

if (sequential) {
  for (const suite of suites) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runSuite(suite, suiteEnv));
  }
} else {
  results.push(
    ...(await Promise.all(suites.map((suite) => runSuite(suite, suiteEnv))))
  );
}

const failures = results
  .filter(({ code }) => code !== 0)
  .map(({ suite }) => suite);

process.stdout.write("\nE2E suite timings:\n");
for (const { suite, duration } of results) {
  process.stdout.write(`- test:e2e:${suite}: ${formatDuration(duration)}\n`);
}

// Collect and merge blob reports regardless of suite outcomes.
if (skipMerge) {
  process.stdout.write(
    "\nSkipping merged e2e report because E2E_SKIP_MERGE is set.\n"
  );
} else {
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
