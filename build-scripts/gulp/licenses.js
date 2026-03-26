// Gulp task to generate third-party license notices.

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
const LICENSE_OVERRIDES = {
  "type-fest@5.4.4": path.resolve(
    paths.root_dir,
    "node_modules/type-fest/license-mit"
  ),
};

gulp.task("gen-licenses", async () => {
  await generateLicenseFile(
    path.resolve(paths.root_dir, "package.json"),
    OUTPUT_FILE,
    { append: NOTICE_FILES, replace: LICENSE_OVERRIDES }
  );
});
