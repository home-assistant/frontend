// Gulp task to generate third-party license notices.

import { readFile, access } from "fs/promises";
import { generateLicenseFile } from "generate-license-file";
import gulp from "gulp";
import path from "path";
import paths from "../paths.cjs";

const OUTPUT_FILE = path.join(
  paths.app_output_static,
  "third-party-licenses.txt"
);

// The echarts package ships an Apache-2.0 NOTICE file that must be
// redistributed alongside the compiled output per Apache License §4(d).
const NOTICE_FILES = [
  path.resolve(paths.root_dir, "node_modules/echarts/NOTICE"),
];

// type-fest ships two license files (MIT for code, CC0 for types).
// We use the MIT license since that covers the bundled code.
//
// Each entry is pinned to a specific version. If a package is updated,
// this list must be reviewed and the version updated after verifying
// that the new version's license still matches. The build will fail
// if the installed version does not match the pinned version.
const LICENSE_OVERRIDES = [
  {
    // type-fest ships two license files (MIT for code, CC0 for types).
    // We use the MIT license since that covers the bundled code.
    packageName: "type-fest",
    version: "5.6.0",
    licensePath: path.resolve(
      paths.root_dir,
      "node_modules/type-fest/license-mit"
    ),
  },
];

gulp.task("gen-licenses", async () => {
  const licenseOverrides = {};

  for (const { packageName, version, licensePath } of LICENSE_OVERRIDES) {
    const pkgJsonPath = path.resolve(
      paths.root_dir,
      `node_modules/${packageName}/package.json`
    );

    let packageJSON;
    try {
      // eslint-disable-next-line no-await-in-loop
      packageJSON = JSON.parse(await readFile(pkgJsonPath, "utf-8"));
    } catch {
      throw new Error(
        `package.json for "${packageName}" not found or unreadable at ${pkgJsonPath}`
      );
    }

    if (packageJSON.version !== version) {
      throw new Error(
        `License override for "${packageName}" is pinned to version ${version}, but found version ${packageJSON.version}. ` +
          `Please verify the new version's license and update the override in build-scripts/gulp/licenses.js.`
      );
    }

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
