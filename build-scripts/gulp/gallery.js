// Run demo develop mode
const gulp = require("gulp");
const fs = require("fs");
const path = require("path");

const env = require("../env");
const paths = require("../paths");

require("./clean.js");
require("./translations.js");
require("./gen-icons-json.js");
require("./gather-static.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");
require("./rollup.js");

gulp.task("gather-gallery-demos", async function gatherDemos() {
  const files = await fs.promises.readdir(
    path.resolve(paths.gallery_dir, "src/demos")
  );

  let content = "export const DEMOS = {\n";

  for (const file of files) {
    const demoId = path.basename(file, ".ts");
    const demoPath = "../src/demos/" + demoId;
    content += `  "${demoId}": () => import("${demoPath}"),\n`;
  }

  content += "};";

  const galleryBuild = path.resolve(paths.gallery_dir, "build");

  fs.mkdirSync(galleryBuild, { recursive: true });
  fs.writeFileSync(
    path.resolve(galleryBuild, "import-demos.ts"),
    content,
    "utf-8"
  );
});

gulp.task(
  "develop-gallery",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-gallery",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "build-translations",
      "gather-gallery-demos"
    ),
    "copy-static-gallery",
    "gen-index-gallery-dev",
    env.useRollup() ? "rollup-dev-server-gallery" : "webpack-dev-server-gallery"
  )
);

gulp.task(
  "build-gallery",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-gallery",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "build-translations",
      "gather-gallery-demos"
    ),
    "copy-static-gallery",
    env.useRollup() ? "rollup-prod-gallery" : "webpack-prod-gallery",
    "gen-index-gallery-prod"
  )
);
