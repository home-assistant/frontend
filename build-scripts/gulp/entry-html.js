// Tasks to generate entry HTML

import {
  applyVersionsToRegexes,
  compileRegex,
  getPreUserAgentRegexes,
} from "browserslist-useragent-regexp";
import fs from "fs-extra";
import gulp from "gulp";
import { minify } from "html-minifier-terser";
import template from "lodash.template";
import { dirname, extname, resolve } from "node:path";
import { htmlMinifierOptions, terserOptions } from "../bundle.cjs";
import paths from "../paths.cjs";

// macOS companion app has no way to obtain the Safari version used by WKWebView,
// and it is not in the default user agent string. So we add an additional regex
// to serve modern based on a minimum macOS version. We take the minimum Safari
// major version from browserslist and manually map that to a supported macOS
// version. Note this assumes the user has kept Safari updated.
const HA_MACOS_REGEX =
  /Home Assistant\/[\d.]+ \(.+; macOS (\d+)\.(\d+)(?:\.(\d+))?\)/;
const SAFARI_TO_MACOS = {
  15: [10, 15, 0],
  16: [11, 0, 0],
  17: [12, 0, 0],
  18: [13, 0, 0],
};

const getCommonTemplateVars = () => {
  const browserRegexes = getPreUserAgentRegexes({
    env: "modern",
    allowHigherVersions: true,
    mobileToDesktop: true,
    throwOnMissing: true,
  });
  const minSafariVersion = browserRegexes.find(
    (regex) => regex.family === "safari"
  )?.matchedVersions[0][0];
  const minMacOSVersion = SAFARI_TO_MACOS[minSafariVersion];
  if (!minMacOSVersion) {
    throw Error(
      `Could not find minimum MacOS version for Safari ${minSafariVersion}.`
    );
  }
  const haMacOSRegex = applyVersionsToRegexes(
    [
      {
        family: "ha_macos",
        regex: HA_MACOS_REGEX,
        matchedVersions: [minMacOSVersion],
        requestVersions: [minMacOSVersion],
      },
    ],
    { ignorePatch: true, allowHigherVersions: true }
  );
  return {
    modernRegex: compileRegex(browserRegexes.concat(haMacOSRegex)).toString(),
    hassUrl: process.env.HASS_URL || "",
  };
};

const renderTemplate = (templateFile, data = {}) => {
  const compiled = template(
    fs.readFileSync(templateFile, { encoding: "utf-8" })
  );
  return compiled({
    ...data,
    // Resolve any child/nested templates relative to the parent and pass the same data
    renderTemplate: (childTemplate) =>
      renderTemplate(resolve(dirname(templateFile), childTemplate), data),
  });
};

const WRAP_TAGS = { ".js": "script", ".css": "style" };

const minifyHtml = (content, ext) => {
  const wrapTag = WRAP_TAGS[ext] || "";
  const begTag = wrapTag && `<${wrapTag}>`;
  const endTag = wrapTag && `</${wrapTag}>`;
  return minify(begTag + content + endTag, {
    ...htmlMinifierOptions,
    conservativeCollapse: false,
    minifyJS: terserOptions({
      latestBuild: false, // Shared scripts should be ES5
      isTestBuild: true, // Don't need source maps
    }),
  }).then((wrapped) =>
    wrapTag ? wrapped.slice(begTag.length, -endTag.length) : wrapped
  );
};

// Function to generate a dev task for each project's configuration
const genPagesDevTask =
  (
    pageEntries,
    inputRoot,
    outputRoot,
    inputSub = "src/html",
    publicRoot = ""
  ) =>
  async () => {
    const commonVars = getCommonTemplateVars();
    for (const [page, entries] of Object.entries(pageEntries)) {
      const content = renderTemplate(
        resolve(inputRoot, inputSub, `${page}.template`),
        {
          ...commonVars,
          latestEntryJS: entries.map(
            (entry) => `${publicRoot}/frontend_latest/${entry}.js`
          ),
          es5EntryJS: entries.map(
            (entry) => `${publicRoot}/frontend_es5/${entry}.js`
          ),
          latestCustomPanelJS: `${publicRoot}/frontend_latest/custom-panel.js`,
          es5CustomPanelJS: `${publicRoot}/frontend_es5/custom-panel.js`,
        }
      );
      fs.outputFileSync(resolve(outputRoot, page), content);
    }
  };

// Same as previous but for production builds
// (includes minification and hashed file names from manifest)
const genPagesProdTask =
  (
    pageEntries,
    inputRoot,
    outputRoot,
    outputLatest,
    outputES5,
    inputSub = "src/html"
  ) =>
  async () => {
    const latestManifest = fs.readJsonSync(
      resolve(outputLatest, "manifest.json")
    );
    const es5Manifest = outputES5
      ? fs.readJsonSync(resolve(outputES5, "manifest.json"))
      : {};
    const commonVars = getCommonTemplateVars();
    const minifiedHTML = [];
    for (const [page, entries] of Object.entries(pageEntries)) {
      const content = renderTemplate(
        resolve(inputRoot, inputSub, `${page}.template`),
        {
          ...commonVars,
          latestEntryJS: entries.map((entry) => latestManifest[`${entry}.js`]),
          es5EntryJS: entries.map((entry) => es5Manifest[`${entry}.js`]),
          latestCustomPanelJS: latestManifest["custom-panel.js"],
          es5CustomPanelJS: es5Manifest["custom-panel.js"],
        }
      );
      minifiedHTML.push(
        minifyHtml(content, extname(page)).then((minified) =>
          fs.outputFileSync(resolve(outputRoot, page), minified)
        )
      );
    }
    await Promise.all(minifiedHTML);
  };

// Map HTML pages to their required entrypoints
const APP_PAGE_ENTRIES = {
  "authorize.html": ["authorize"],
  "onboarding.html": ["onboarding"],
  "index.html": ["core", "app"],
};

gulp.task(
  "gen-pages-app-dev",
  genPagesDevTask(APP_PAGE_ENTRIES, paths.root_dir, paths.app_output_root)
);

gulp.task(
  "gen-pages-app-prod",
  genPagesProdTask(
    APP_PAGE_ENTRIES,
    paths.root_dir,
    paths.app_output_root,
    paths.app_output_latest,
    paths.app_output_es5
  )
);

const CAST_PAGE_ENTRIES = {
  "faq.html": ["launcher"],
  "index.html": ["launcher"],
  "media.html": ["media"],
  "receiver.html": ["receiver"],
};

gulp.task(
  "gen-pages-cast-dev",
  genPagesDevTask(CAST_PAGE_ENTRIES, paths.cast_dir, paths.cast_output_root)
);

gulp.task(
  "gen-pages-cast-prod",
  genPagesProdTask(
    CAST_PAGE_ENTRIES,
    paths.cast_dir,
    paths.cast_output_root,
    paths.cast_output_latest,
    paths.cast_output_es5
  )
);

const DEMO_PAGE_ENTRIES = { "index.html": ["main"] };

gulp.task(
  "gen-pages-demo-dev",
  genPagesDevTask(DEMO_PAGE_ENTRIES, paths.demo_dir, paths.demo_output_root)
);

gulp.task(
  "gen-pages-demo-prod",
  genPagesProdTask(
    DEMO_PAGE_ENTRIES,
    paths.demo_dir,
    paths.demo_output_root,
    paths.demo_output_latest,
    paths.demo_output_es5
  )
);

const GALLERY_PAGE_ENTRIES = { "index.html": ["entrypoint"] };

gulp.task(
  "gen-pages-gallery-dev",
  genPagesDevTask(
    GALLERY_PAGE_ENTRIES,
    paths.gallery_dir,
    paths.gallery_output_root
  )
);

gulp.task(
  "gen-pages-gallery-prod",
  genPagesProdTask(
    GALLERY_PAGE_ENTRIES,
    paths.gallery_dir,
    paths.gallery_output_root,
    paths.gallery_output_latest
  )
);

const LANDING_PAGE_PAGE_ENTRIES = { "index.html": ["entrypoint"] };

gulp.task(
  "gen-pages-landing-page-dev",
  genPagesDevTask(
    LANDING_PAGE_PAGE_ENTRIES,
    paths.landingPage_dir,
    paths.landingPage_output_root
  )
);

gulp.task(
  "gen-pages-landing-page-prod",
  genPagesProdTask(
    LANDING_PAGE_PAGE_ENTRIES,
    paths.landingPage_dir,
    paths.landingPage_output_root,
    paths.landingPage_output_latest,
    paths.landingPage_output_es5
  )
);

const HASSIO_PAGE_ENTRIES = { "entrypoint.js": ["entrypoint"] };

gulp.task(
  "gen-pages-hassio-dev",
  genPagesDevTask(
    HASSIO_PAGE_ENTRIES,
    paths.hassio_dir,
    paths.hassio_output_root,
    "src",
    paths.hassio_publicPath
  )
);

gulp.task(
  "gen-pages-hassio-prod",
  genPagesProdTask(
    HASSIO_PAGE_ENTRIES,
    paths.hassio_dir,
    paths.hassio_output_root,
    paths.hassio_output_latest,
    paths.hassio_output_es5,
    "src"
  )
);
