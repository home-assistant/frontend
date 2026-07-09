#!/usr/bin/env node
// Runs CI-style Playwright shards locally, keeps going after shard failures,
// then collects and merges the blob reports.
//
// Usage: node test/e2e/run-sharded-suites.mjs [<suite> ...] [options] [-- <playwright args>]
// Suites default to demo, app, gallery. Shard counts match the CI workflow.

import { execFileSync, spawn } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { availableParallelism } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const TRUE_VALUES = new Set(["1", "true", "yes"]);
const DEFAULT_SUITES = ["demo", "app", "gallery"];
const SUITES = {
  demo: { shards: 4, devScript: "dev:demo" },
  app: { shards: 6, devScript: "test:e2e:app:dev" },
  gallery: { shards: 6, devScript: "dev:gallery" },
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const isTruthy = (value) => TRUE_VALUES.has(value?.toLowerCase() ?? "");

const formatDuration = (ms) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const usage = () => {
  process.stderr
    .write(`Usage: run-sharded-suites.mjs [suite ...] [options] [-- <playwright args>]

Suites: ${Object.keys(SUITES).join(", ")}

Options:
  --jobs <count>       Maximum shard processes to run at once.
  --no-dev-server     Do not start the local suite dev servers first.
  --skip-merge        Do not collect and merge blob reports.
  --help              Show this help text.

Environment:
  E2E_SHARD_JOBS      Default for --jobs.
  E2E_<SUITE>_SHARDS  Override a suite shard count, e.g. E2E_APP_SHARDS=3.
  E2E_WORKERS         Workers per shard. Defaults to 1 for this script.
`);
};

const parseArgs = (argv) => {
  const args = {
    jobs: undefined,
    noDevServer: isTruthy(process.env.E2E_NO_DEV_SERVER),
    skipMerge: isTruthy(process.env.E2E_SKIP_MERGE),
    suites: [],
    playwrightArgs: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      args.playwrightArgs.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--jobs") {
      args.jobs = Number(argv[++i]);
      continue;
    }
    if (arg.startsWith("--jobs=")) {
      args.jobs = Number(arg.slice("--jobs=".length));
      continue;
    }
    if (arg === "--no-dev-server") {
      args.noDevServer = true;
      continue;
    }
    if (arg === "--skip-merge") {
      args.skipMerge = true;
      continue;
    }
    if (arg.startsWith("-")) {
      process.stderr.write(`Unknown option: ${arg}\n`);
      usage();
      process.exit(1);
    }
    args.suites.push(arg);
  }

  if (!args.suites.length) {
    args.suites = DEFAULT_SUITES;
  }

  for (const suite of args.suites) {
    if (!SUITES[suite]) {
      process.stderr.write(`Unknown e2e suite: ${suite}\n`);
      usage();
      process.exit(1);
    }
  }

  return args;
};

const readPositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

const shardTotalFor = (suite) =>
  readPositiveInteger(process.env[`E2E_${suite.toUpperCase()}_SHARDS`]) ??
  SUITES[suite].shards;

const writePrefixed = (label, stream, chunk, pending) => {
  const lines = `${pending.value}${chunk}`.split(/\r?\n/);
  pending.value = lines.pop() ?? "";
  for (const line of lines) {
    stream.write(`[${label}] ${line}\n`);
  }
};

const flushPrefixed = (label, stream, pending) => {
  if (!pending.value) return;
  stream.write(`[${label}] ${pending.value}\n`);
  pending.value = "";
};

const resetReports = (suites) => {
  rmSync(join(repoRoot, "test/e2e/reports/blob"), {
    recursive: true,
    force: true,
  });
  rmSync(join(repoRoot, "test/e2e/reports/combined"), {
    recursive: true,
    force: true,
  });
  for (const suite of suites) {
    rmSync(join(repoRoot, "test/e2e/reports", suite), {
      recursive: true,
      force: true,
    });
    rmSync(join(repoRoot, "test/e2e/test-results", suite), {
      recursive: true,
      force: true,
    });
  }
};

const startDevServers = (suites) => {
  for (const suite of suites) {
    process.stdout.write(`\n--- Starting dev server: ${suite} ---\n`);
    execFileSync("yarn", [SUITES[suite].devScript, "--background"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
};

const runShard = ({ suite, index, total }, playwrightArgs) =>
  new Promise((resolvePromise) => {
    const started = Date.now();
    const label = `${suite} ${index}/${total}`;
    const blobFile = join(
      repoRoot,
      "test/e2e/reports",
      suite,
      `shard-${index}-of-${total}.zip`
    );
    const outputDir = join(
      repoRoot,
      "test/e2e/test-results",
      suite,
      `shard-${index}-of-${total}`
    );
    mkdirSync(dirname(blobFile), { recursive: true });

    const env = {
      ...process.env,
      E2E_WORKERS: process.env.E2E_WORKERS ?? "1",
      PLAYWRIGHT_BLOB_OUTPUT_FILE: blobFile,
    };
    const child = spawn(
      "yarn",
      [
        `test:e2e:${suite}`,
        `--shard=${index}/${total}`,
        `--output=${outputDir}`,
        ...playwrightArgs,
      ],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        env,
      }
    );
    const pendingStdout = { value: "" };
    const pendingStderr = { value: "" };

    process.stdout.write(`\n--- Running shard: ${label} ---\n`);

    child.stdout.on("data", (chunk) =>
      writePrefixed(label, process.stdout, chunk, pendingStdout)
    );
    child.stderr.on("data", (chunk) =>
      writePrefixed(label, process.stderr, chunk, pendingStderr)
    );

    child.on("error", (err) => {
      flushPrefixed(label, process.stdout, pendingStdout);
      flushPrefixed(label, process.stderr, pendingStderr);
      process.stderr.write(`[${label}] Failed to start: ${err.message}\n`);
      resolvePromise({
        suite,
        index,
        total,
        code: 1,
        duration: Date.now() - started,
      });
    });

    child.on("close", (code) => {
      flushPrefixed(label, process.stdout, pendingStdout);
      flushPrefixed(label, process.stderr, pendingStderr);
      const duration = Date.now() - started;
      process.stdout.write(
        `--- Finished shard: ${label} (${formatDuration(duration)}) ---\n`
      );
      resolvePromise({ suite, index, total, code: code ?? 1, duration });
    });
  });

const runJobs = async (jobs, concurrency, playwrightArgs) => {
  const results = [];
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, jobs.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < jobs.length) {
        const job = jobs[nextIndex++];
        // eslint-disable-next-line no-await-in-loop
        results.push(await runShard(job, playwrightArgs));
      }
    })
  );

  return results;
};

const mergeReports = (suites) => {
  execFileSync("node", ["test/e2e/collect-blob-reports.mjs", ...suites], {
    cwd: repoRoot,
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
    { cwd: repoRoot, stdio: "inherit" }
  );
};

const args = parseArgs(process.argv.slice(2));
const jobs = args.suites.flatMap((suite) => {
  const total = shardTotalFor(suite);
  return Array.from({ length: total }, (_, index) => ({
    suite,
    index: index + 1,
    total,
  }));
});
const concurrency =
  args.jobs ??
  readPositiveInteger(process.env.E2E_SHARD_JOBS) ??
  Math.min(jobs.length, availableParallelism());

if (!readPositiveInteger(concurrency)) {
  process.stderr.write("Shard job count must be a positive integer.\n");
  process.exit(1);
}

resetReports(args.suites);

if (args.noDevServer) {
  process.stdout.write("Skipping dev server startup.\n");
} else {
  startDevServers(args.suites);
}

process.stdout.write(
  `\nRunning ${jobs.length} shard(s) with up to ${concurrency} concurrent job(s).\n`
);
if (!process.env.E2E_WORKERS) {
  process.stdout.write("Using 1 Playwright worker per shard.\n");
}

const results = await runJobs(jobs, concurrency, args.playwrightArgs);
const orderedResults = results.toSorted(
  (a, b) =>
    args.suites.indexOf(a.suite) - args.suites.indexOf(b.suite) ||
    a.index - b.index
);
const failures = orderedResults.filter(({ code }) => code !== 0);

process.stdout.write("\nE2E shard timings:\n");
for (const { suite, index, total, duration } of orderedResults) {
  process.stdout.write(
    `- ${suite} ${index}/${total}: ${formatDuration(duration)}\n`
  );
}

let mergeFailed = false;
if (args.skipMerge) {
  process.stdout.write(
    "\nSkipping merged e2e report because --skip-merge or E2E_SKIP_MERGE is set.\n"
  );
} else {
  try {
    mergeReports(args.suites);
  } catch (err) {
    mergeFailed = true;
    process.stderr.write(`\nFailed to merge e2e reports: ${err.message}\n`);
  }
}

if (failures.length) {
  process.stderr.write(
    `\nFailed shards: ${failures
      .map(({ suite, index, total }) => `${suite} ${index}/${total}`)
      .join(", ")}\n`
  );
}

if (failures.length || mergeFailed) {
  process.exit(1);
}
