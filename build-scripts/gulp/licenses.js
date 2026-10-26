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
    version: "5.10.0",
    licenseFile: "license-mit",
  },
];

// Locate the directory of an installed package matching an exact version.
//
// pnpm stores every installed version under
// node_modules/.pnpm/<name>@<version>[(peers)]/node_modules/<name>, with the
// "/" of scoped names replaced by "+". Looking there finds the pinned version
// whether or not it is the one linked at the top level.
async function findPackageDir(packageName, version) {
  const storeDir = path.join(NODE_MODULES, ".pnpm");
  const prefix = `${packageName.replace("/", "+")}@${version}`;
  const entries = await readdir(storeDir).catch(() => []);

  for (const entry of entries) {
    if (entry !== prefix && !entry.startsWith(`${prefix}(`)) {
      continue;
    }
    const dir = path.join(storeDir, entry, "node_modules", packageName);
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
