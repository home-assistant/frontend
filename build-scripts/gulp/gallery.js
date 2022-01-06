// Run demo develop mode
const gulp = require("gulp");
const fs = require("fs");
const path = require("path");
const marked = require("marked");

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
  const demoDir = path.resolve(paths.gallery_dir, "src/demos");
  const files = await fs.promises.readdir(demoDir);

  const galleryBuild = path.resolve(paths.gallery_dir, "build");
  fs.mkdirSync(galleryBuild, { recursive: true });

  let content = "export const DEMOS = {\n";

  const processed = new Set();

  for (const file of files) {
    let demoId = path.basename(
      file,
      file.endsWith(".ts") ? ".ts" : ".markdown"
    );

    // Can be processed if we saw demo or description before.
    if (processed.has(demoId)) {
      continue;
    }

    processed.add(demoId);

    const demoFile = path.resolve(demoDir, `${demoId}.ts`);

    const descriptionFile = path.resolve(demoDir, `${demoId}.markdown`);
    const hasDemo = fs.existsSync(demoFile);
    const hasDescription = fs.existsSync(descriptionFile);
    if (hasDescription) {
      const descriptionContent = fs.readFileSync(descriptionFile, "utf-8");
      fs.writeFileSync(
        path.resolve(galleryBuild, `${demoId}-description.ts`),
        `
        import {html} from "lit";
        export default html\`${marked(descriptionContent)}\`
        `
      );
    }
    const demoPath = `../src/demos/${demoId}`;
    const descriptionPath = `./${demoId}-description`;
    content += `  "${demoId.substring(5)}": {
      ${
        hasDescription
          ? `description: () => import("${descriptionPath}").then(m => m.default),`
          : ""
      }
      ${hasDemo ? `load: () => import("${demoPath}")` : ""}

    },\n`;
  }

  content += "};";

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
      "build-locale-data",
      "gather-gallery-demos"
    ),
    "copy-static-gallery",
    "gen-index-gallery-dev",
    gulp.parallel(
      env.useRollup()
        ? "rollup-dev-server-gallery"
        : "webpack-dev-server-gallery",
      async function watchMarkdownFiles() {
        gulp.watch(
          path.resolve(paths.gallery_dir, "src/demos/*.markdown"),
          gulp.series("gather-gallery-demos")
        );
      }
    )
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
      "build-locale-data",
      "gather-gallery-demos"
    ),
    "copy-static-gallery",
    env.useRollup() ? "rollup-prod-gallery" : "webpack-prod-gallery",
    "gen-index-gallery-prod"
  )
);
