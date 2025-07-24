import { glob } from "glob";
import { parallel, series, watch } from "gulp";
import yaml from "js-yaml";
import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import paths from "../paths.ts";
import { cleanGallery } from "./clean.ts";
import { genPagesGalleryDev, genPagesGalleryProd } from "./entry-html.ts";
import { copyStaticGallery } from "./gather-static.ts";
import { genIconsJson } from "./gen-icons-json.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackDevServerGallery, rspackProdGallery } from "./rspack.ts";
import {
  buildTranslations,
  translationsEnableMergeBackend,
} from "./translations.ts";

// gather-gallery-pages
export const gatherGalleryPages = async function gatherPages() {
  const pageDir = path.resolve(paths.gallery_dir, "src/pages");
  const files = await glob(path.resolve(pageDir, "**/*"));

  const galleryBuild = path.resolve(paths.gallery_dir, "build");
  fs.mkdirSync(galleryBuild, { recursive: true });

  let content = "export const PAGES = {\n";

  const processed = new Set<string>();

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
        metadata = yaml.load(
          descriptionContent.substring(3, metadataEnd)
        ) as any;
        descriptionContent = descriptionContent
          .substring(metadataEnd + 3)
          .trim();
      }

      // If description is just metadata
      if (descriptionContent === "") {
        hasDescription = false;
      } else {
        // eslint-disable-next-line no-await-in-loop
        descriptionContent = await marked(descriptionContent);
        descriptionContent = descriptionContent.replace(/`/g, "\\`");
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

  for (const group of Object.values(sidebar) as {
    category: string;
    pages?: string[];
  }[]) {
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
      group.pages.push(page as string);
    }
  }

  for (const [category, pages] of Object.entries(pagesToProcess)) {
    sidebar.push({
      category,
      header: category,
      pages: Array.from(pages as Set<string>).sort(),
    });
  }

  content += `export const SIDEBAR = ${JSON.stringify(sidebar, null, 2)};\n`;

  fs.writeFileSync(
    path.resolve(galleryBuild, "import-pages.ts"),
    content,
    "utf-8"
  );
};

// develop-gallery
export const developGallery = series(
  async function setEnv() {
    process.env.NODE_ENV = "development";
  },
  cleanGallery,
  translationsEnableMergeBackend,
  parallel(
    genIconsJson,
    buildTranslations,
    buildLocaleData,
    gatherGalleryPages
  ),
  copyStaticGallery,
  genPagesGalleryDev,
  parallel(rspackDevServerGallery, async function watchMarkdownFiles() {
    watch(
      [
        path.resolve(paths.gallery_dir, "src/pages/**/*.markdown"),
        path.resolve(paths.gallery_dir, "sidebar.js"),
      ],
      series(gatherGalleryPages)
    );
  })
);

// build-gallery
export const buildGallery = series(
  async function setEnv() {
    process.env.NODE_ENV = "production";
  },
  cleanGallery,
  translationsEnableMergeBackend,
  parallel(
    genIconsJson,
    buildTranslations,
    buildLocaleData,
    gatherGalleryPages
  ),
  copyStaticGallery,
  rspackProdGallery,
  genPagesGalleryProd
);
