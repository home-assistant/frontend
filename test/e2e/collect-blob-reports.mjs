#!/usr/bin/env node
// Collects blob reports from each suite into a single staging directory so
// `playwright merge-reports` can consume them from one path.
//
// Usage: node test/e2e/collect-blob-reports.mjs

import { cpSync, mkdirSync, readdirSync, rmSync } from "fs";
import { relative } from "path";

const findBlobReports = (dir) => {
  const files = [];
  const walk = (currentDir) => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const path = `${currentDir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith(".zip")) {
        files.push(path);
      }
    }
  };

  try {
    walk(dir);
  } catch {
    return undefined;
  }

  return files;
};

const dest = "test/e2e/reports/blob";
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const suite of ["demo", "app", "gallery"]) {
  const src = `test/e2e/reports/${suite}`;
  const files = findBlobReports(src);
  if (!files?.length) {
    // Suite report directory doesn't exist (e.g. job was skipped or failed
    // before uploading). Skip gracefully.
    process.stderr.write(
      `Warning: no blob reports found for suite "${suite}" (${src} missing), skipping.\n`
    );
    continue;
  }
  for (const file of files) {
    const name = relative(src, file).replace(/[\\/]/g, "-");
    cpSync(file, `${dest}/${suite}-${name}`);
  }
}
