#!/usr/bin/env node
// Collects blob reports from each suite into a single staging directory so
// `playwright merge-reports` can consume them from one path.
//
// Usage: node test/e2e/collect-blob-reports.mjs

import { cpSync, mkdirSync, readdirSync, rmSync } from "fs";

const dest = "test/e2e/reports/blob";
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const suite of ["demo", "app", "gallery"]) {
  const src = `test/e2e/reports/${suite}`;
  let files;
  try {
    files = readdirSync(src).filter((f) => f.endsWith(".zip"));
  } catch {
    // Suite report directory doesn't exist (e.g. job was skipped or failed
    // before uploading). Skip gracefully.
    process.stderr.write(
      `Warning: no blob reports found for suite "${suite}" (${src} missing), skipping.\n`
    );
    continue;
  }
  for (const file of files) {
    cpSync(`${src}/${file}`, `${dest}/${suite}-${file}`);
  }
}
