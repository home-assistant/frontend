import fs from "fs";
import { glob } from "glob";
import gulp from "gulp";
import yaml from "js-yaml";
import { marked } from "marked";
import path from "path";
import env from "../env.cjs";
import paths from "../paths.cjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./rollup.js";
import "./service-worker.js";
import "./translations.js";
import "./webpack.js";

gulp.task("gather-gallery-pages", async function gatherPages() {
  const pageDir = path.resolve(paths.gallery_dir, "src/pages");
  const files = await glob(path.resolve(pageDir, "**/*"));

  const galleryBuild = path.resolve(paths.gallery_dir, "build");
  fs.mkdirSync(galleryBuild, { recursive: true });

  let content = "export const PAGES = {\n";

  const processed = new Set();

  for (const file of files) {
    if (fs.lstatSync(file).isDirectory()) {
      continue;
    }
    const pageId = file.substring(pageDir.length + 1, file.lastIndexOf("."));

    if (processed.has(pageId)) {
      continue;
    }
    processed.add(pageId);

    const [category] = pageId.split("/", 2);

    const demoFile = path.resolve(pageDir, `${pageId}.ts`);
    const descriptionFile = path.resolve(pageDir, `${pageId}.markdown`);
    const hasDemo = fs.existsSync(demoFile);
    let hasDescription = fs.existsSync(descriptionFile);
    let metadata = {};
    if (hasDescription) {
      let descriptionContent = fs.readFileSync(descriptionFile, "utf-8");

      if (descriptionContent.startsWith("---")) {
        const metadataEnd = descriptionContent.indexOf("---", 3);
        metadata = yaml.load(descriptionContent.substring(3, metadataEnd));
        descriptionContent = descriptionContent
          .substring(metadataEnd + 3)
          .trim();
      }

      // If description is just metadata
      if (descriptionContent === "") {
        hasDescription = false;
      } else {
        descriptionContent = marked(descriptionContent).replace(/`/g, "\\`");
        fs.mkdirSync(path.resolve(galleryBuild, category), { recursive: true });
        fs.writeFileSync(
          path.resolve(galleryBuild, `${pageId}-description.ts`),
          `
          import {html} from "lit";
          export default html\`${descriptionContent}\`
          `
        );
      }
    }
    content += `  "${pageId}": {
      metadata: ${JSON.stringify(metadata)},
      ${
        hasDescription
          ? `description: () => import("./${pageId}-description").then(m => m.default),`
          : ""
      }
      ${hasDemo ? `demo: () => import("../src/pages/${pageId}")` : ""}

    },\n`;
  }

  content += "};\n";

  // Generate sidebar
  const sidebarPath = path.resolve(paths.gallery_dir, "sidebar.js");
  const sidebar = (await import(sidebarPath)).default;

  const pagesToProcess = {};
  for (const key of processed) {
    const [category, page] = key.split("/", 2);
    if (!(category in pagesToProcess)) {
      pagesToProcess[category] = new Set();
    }
    pagesToProcess[category].add(page);
  }

  for (const group of Object.values(sidebar)) {
    const toProcess = pagesToProcess[group.category];
    delete pagesToProcess[group.category];

    if (!toProcess) {
      console.error("Unknown category", group.category);
      if (!group.pages) {
        group.pages = [];
      }
      continue;
    }

    // Any pre-defined groups will not be sorted.
    if (group.pages) {
      for (const page of group.pages) {
        if (!toProcess.delete(page)) {
          console.error("Found unreferenced demo", page);
        }
      }
    } else {
      group.pages = [];
    }
    for (const page of Array.from(toProcess).sort()) {
      group.pages.push(page);
    }
  }

  for (const [category, pages] of Object.entries(pagesToProcess)) {
    sidebar.push({
      category,
      header: category,
      pages: Array.from(pages).sort(),
    });
  }

  content += `export const SIDEBAR = ${JSON.stringify(sidebar, null, 2)};\n`;

  fs.writeFileSync(
    path.resolve(galleryBuild, "import-pages.ts"),
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
      "gather-gallery-pages"
    ),
    "copy-static-gallery",
    "gen-pages-gallery-dev",
    gulp.parallel(
      env.useRollup()
        ? "rollup-dev-server-gallery"
        : "webpack-dev-server-gallery",
      async function watchMarkdownFiles() {
        gulp.watch(
          [
            path.resolve(paths.gallery_dir, "src/pages/**/*.markdown"),
            path.resolve(paths.gallery_dir, "sidebar.js"),
          ],
          gulp.series("gather-gallery-pages")
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
      "gather-gallery-pages"
    ),
    "copy-static-gallery",
    env.useRollup() ? "rollup-prod-gallery" : "webpack-prod-gallery",
    "gen-pages-gallery-prod"
  )
);
