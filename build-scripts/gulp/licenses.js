// Gulp task to generate third-party license notices.

import { readFile, access, readdir } from "fs/promises";
import { generateLicenseFile } from "generate-license-file";
import gulp from "gulp";
import path from "path";
import paths from "../paths.cjs";

const OUTPUT_FILE = path.join(
  paths.app_output_static,
  "third-party-licenses.txt"
);

const NODE_MODULES = path.resolve(paths.root_dir, "node_modules");

// The echarts package ships an Apache-2.0 NOTICE file that must be
// redistributed alongside the compiled output per Apache License §4(d).
const NOTICE_FILES = [path.join(NODE_MODULES, "echarts/NOTICE")];

// Some packages need a manual license override (e.g. they ship multiple
// license files and we must pick the right one for the bundled code).
//
// Each entry is pinned to a specific version. If a package is updated,
// this list must be reviewed and the version updated after verifying
// that the new version's license still matches. The build will fail if
// the pinned version is no longer installed.
const LICENSE_OVERRIDES = [
  {
    // type-fest ships two license files (MIT for code, CC0 for types).
    // We use the MIT license since that covers the bundled code.
    packageName: "type-fest",
    version: "5.8.0",
    licenseFile: "license-mit",
  },
];

// Locate the directory of an installed package matching an exact version.
//
// The copy we care about may be hoisted to the top-level node_modules or
// nested under a dependency when a different version occupies the hoisted
// slot (e.g. a build-only dependency pulling in an older release). Searching
// both keeps this check independent of yarn's hoisting decisions, which can
// shift when unrelated dependencies are added.
async function findPackageDir(packageName, version) {
  const candidateDirs = [path.join(NODE_MODULES, packageName)];

  // Collect one level of nesting: node_modules/<dep>/node_modules/<pkg> and
  // node_modules/@scope/<dep>/node_modules/<pkg>.
  let topLevel = [];
  try {
    topLevel = await readdir(NODE_MODULES, { withFileTypes: true });
  } catch {
    // node_modules unreadable — fall back to the hoisted candidate only.
  }
  for (const entry of topLevel) {
    if (!entry.isDirectory() || entry.name === packageName) {
      continue;
    }
    if (entry.name.startsWith("@")) {
      const scopeDir = path.join(NODE_MODULES, entry.name);
      // eslint-disable-next-line no-await-in-loop
      const scoped = await readdir(scopeDir, { withFileTypes: true }).catch(
        () => []
      );
      for (const dep of scoped) {
        if (dep.isDirectory()) {
          candidateDirs.push(
            path.join(scopeDir, dep.name, "node_modules", packageName)
          );
        }
      }
    } else {
      candidateDirs.push(
        path.join(NODE_MODULES, entry.name, "node_modules", packageName)
      );
    }
  }

  for (const dir of candidateDirs) {
    // eslint-disable-next-line no-await-in-loop
    const pkg = await readFile(path.join(dir, "package.json"), "utf-8")
      .then(JSON.parse)
      .catch(() => null);
    if (pkg?.version === version) {
      return dir;
    }
  }
  return null;
}

gulp.task("gen-licenses", async () => {
  const licenseOverrides = {};

  for (const { packageName, version, licenseFile } of LICENSE_OVERRIDES) {
    // eslint-disable-next-line no-await-in-loop
    const packageDir = await findPackageDir(packageName, version);

    if (!packageDir) {
      throw new Error(
        `License override for "${packageName}" is pinned to version ${version}, but that version is not installed. ` +
          `Please verify the new version's license and update the override in build-scripts/gulp/licenses.js.`
      );
    }

    const licensePath = path.join(packageDir, licenseFile);
    try {
      // eslint-disable-next-line no-await-in-loop
      await access(licensePath);
    } catch {
      throw new Error(`License file not found or unreadable: ${licensePath}`);
    }

    licenseOverrides[`${packageName}@${version}`] = licensePath;
  }

  await generateLicenseFile(
    path.resolve(paths.root_dir, "package.json"),
    OUTPUT_FILE,
    { append: NOTICE_FILES, replace: licenseOverrides }
  );
});
