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
  for (const file of readdirSync(src).filter((f) => f.endsWith(".zip"))) {
    cpSync(`${src}/${file}`, `${dest}/${suite}-${file}`);
  }
}
