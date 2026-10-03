/* global require, process, __dirname */
// Enforce a strict size budget on the initial JS of the most critical
// entrypoints (`app` and `core`). These two are downloaded on every cold load
// before anything interactive can happen, so unintended growth here hurts
// first-load performance directly.
//
// In production rspack does not split initial chunks (splitChunks only operates
// on `!chunk.canBeInitial()`), so each entrypoint resolves to a single initial
// JS asset. We read the per-build stats written by StatsWriterPlugin and compare
// the entrypoint's initial JS size against a committed budget.
//
// Usage:
//   node build-scripts/check-bundle-size.cjs            # enforce, exit 1 on regression
//   node build-scripts/check-bundle-size.cjs --update    # rewrite budgets from current sizes
//   node build-scripts/check-bundle-size.cjs --update --headroom=3   # current + 3% headroom

const fs = require("fs");
const path = require("path");
const paths = require("./paths.cjs");

// Entrypoints whose initial JS we hold to a strict budget. These are all
// downloaded on a user-facing cold load before anything interactive can happen:
// `app`/`core` for the main app, plus the standalone `authorize` and
// `onboarding` pages. `custom-panel` is intentionally excluded (only loaded
// when a custom panel is opened).
const TRACKED_ENTRYPOINTS = ["app", "core", "authorize", "onboarding"];

// App build stats files, as written by StatsWriterPlugin (`${name}.json`).
const BUILDS = ["frontend-modern", "frontend-legacy"];

const BUDGET_FILE = path.join(__dirname, "bundle-budget.json");
const STATS_DIR = path.join(paths.build_dir, "stats");

const readStats = (build) => {
  const file = path.join(STATS_DIR, `${build}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing stats file: ${path.relative(process.cwd(), file)}.\n` +
        `Run a production build first (e.g. \`gulp build-app\`), then re-run this check.`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

// Initial JS bytes for an entrypoint = sum of the .js asset sizes of its initial
// entry chunk(s). Sizes are raw (uncompressed) bytes, matching the stats output.
const entrypointInitialJS = (stats, entrypoint) => {
  const assetSize = new Map(stats.assets.map((a) => [a.name, a.size]));
  let total = 0;
  let found = false;
  for (const chunk of stats.chunks) {
    if (!chunk.entry || !chunk.initial) {
      continue;
    }
    if (!(chunk.names || []).includes(entrypoint)) {
      continue;
    }
    found = true;
    for (const file of chunk.files || []) {
      if (file.endsWith(".js") && assetSize.has(file)) {
        total += assetSize.get(file);
      }
    }
  }
  if (!found) {
    throw new Error(`Entrypoint "${entrypoint}" not found in bundle stats.`);
  }
  return total;
};

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

const main = () => {
  const update = process.argv.includes("--update");
  const headroomArg = process.argv.find((a) => a.startsWith("--headroom="));
  const headroom = headroomArg ? Number(headroomArg.split("=")[1]) : 0;

  const current = {};
  for (const build of BUILDS) {
    const stats = readStats(build);
    current[build] = {};
    for (const entrypoint of TRACKED_ENTRYPOINTS) {
      current[build][entrypoint] = entrypointInitialJS(stats, entrypoint);
    }
  }

  if (update) {
    const budget = { _comment: BUDGET_COMMENT };
    for (const build of BUILDS) {
      budget[build] = {};
      for (const entrypoint of TRACKED_ENTRYPOINTS) {
        budget[build][entrypoint] = Math.ceil(
          current[build][entrypoint] * (1 + headroom / 100)
        );
      }
    }
    fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 2)}\n`);
    console.log(
      `Updated ${path.relative(process.cwd(), BUDGET_FILE)} from current sizes` +
        (headroom ? ` (+${headroom}% headroom).` : ".")
    );
    return;
  }

  if (!fs.existsSync(BUDGET_FILE)) {
    throw new Error(
      `Missing budget file ${path.relative(process.cwd(), BUDGET_FILE)}.\n` +
        `Seed it from a production build with: node build-scripts/check-bundle-size.cjs --update --headroom=3`
    );
  }
  const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));

  let failed = false;
  console.log("Initial JS budget (entry chunks, raw bytes):\n");
  for (const build of BUILDS) {
    for (const entrypoint of TRACKED_ENTRYPOINTS) {
      const actual = current[build][entrypoint];
      const limit = budget[build] && budget[build][entrypoint];
      if (typeof limit !== "number") {
        failed = true;
        console.log(
          `  ✗ ${build} / ${entrypoint}: no budget set (current ${kib(actual)})`
        );
        continue;
      }
      const ok = actual <= limit;
      const delta = (((actual - limit) / limit) * 100).toFixed(1);
      console.log(
        `  ${ok ? "✓" : "✗"} ${build} / ${entrypoint}: ` +
          `${kib(actual)} / ${kib(limit)}${ok ? "" : ` (+${delta}% over budget)`}`
      );
      if (!ok) {
        failed = true;
      }
    }
  }

  if (failed) {
    console.error(
      "\nInitial JS budget exceeded for a critical entrypoint.\n" +
        "Investigate what was pulled into the entry chunk (a static import that should be lazy?).\n" +
        "If the growth is intentional, re-seed the budget:\n" +
        "  node build-scripts/check-bundle-size.cjs --update --headroom=3"
    );
    process.exit(1);
  }
  console.log("\nAll tracked entrypoints within budget.");
};

const BUDGET_COMMENT =
  "Initial JS budget (raw/uncompressed bytes) for the cold-load critical entrypoints. " +
  "Enforced by build-scripts/check-bundle-size.cjs in CI. " +
  "Re-seed after an intentional change with `--update --headroom=<percent>`.";

main();
