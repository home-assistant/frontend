// Tasks to generate entry HTML
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const gulp = require("gulp");
const fs = require("fs-extra");
const path = require("path");
const template = require("lodash.template");
const minify = require("html-minifier").minify;
const paths = require("../paths.js");
const env = require("../env.js");

const templatePath = (tpl) =>
  path.resolve(paths.polymer_dir, "src/html/", `${tpl}.html.template`);

const readFile = (pth) => fs.readFileSync(pth).toString();

const renderTemplate = (pth, data = {}, pathFunc = templatePath) => {
  const compiled = template(readFile(pathFunc(pth)));
  return compiled({
    ...data,
    useRollup: env.useRollup(),
    renderTemplate,
  });
};

const renderDemoTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(paths.demo_dir, "src/html/", `${tpl}.html.template`)
  );

const renderCastTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(paths.cast_dir, "src/html/", `${tpl}.html.template`)
  );

const renderGalleryTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(paths.gallery_dir, "src/html/", `${tpl}.html.template`)
  );

const minifyHtml = (content) =>
  minify(content, {
    collapseWhitespace: true,
    minifyJS: true,
    minifyCSS: true,
    removeComments: true,
  });

const PAGES = ["onboarding", "authorize"];

gulp.task("gen-pages-dev", (done) => {
  for (const page of PAGES) {
    const content = renderTemplate(page, {
      latestPageJS: `/frontend_latest/${page}.js`,

      es5PageJS: `/frontend_es5/${page}.js`,
    });

    fs.outputFileSync(
      path.resolve(paths.app_output_root, `${page}.html`),
      content
    );
  }
  done();
});

gulp.task("gen-pages-prod", (done) => {
  const latestManifest = require(path.resolve(
    paths.app_output_latest,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    paths.app_output_es5,
    "manifest.json"
  ));

  for (const page of PAGES) {
    const content = renderTemplate(page, {
      latestPageJS: latestManifest[`${page}.js`],

      es5PageJS: es5Manifest[`${page}.js`],
    });

    fs.outputFileSync(
      path.resolve(paths.app_output_root, `${page}.html`),
      minifyHtml(content)
    );
  }
  done();
});

gulp.task("gen-index-app-dev", (done) => {
  const content = renderTemplate("index", {
    latestAppJS: "/frontend_latest/app.js",
    latestCoreJS: "/frontend_latest/core.js",
    latestCustomPanelJS: "/frontend_latest/custom-panel.js",

    es5AppJS: "/frontend_es5/app.js",
    es5CoreJS: "/frontend_es5/core.js",
    es5CustomPanelJS: "/frontend_es5/custom-panel.js",
  }).replace(/#THEMEC/g, "{{ theme_color }}");

  fs.outputFileSync(path.resolve(paths.app_output_root, "index.html"), content);
  done();
});

gulp.task("gen-index-app-prod", (done) => {
  const latestManifest = require(path.resolve(
    paths.app_output_latest,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    paths.app_output_es5,
    "manifest.json"
  ));
  const content = renderTemplate("index", {
    latestAppJS: latestManifest["app.js"],
    latestCoreJS: latestManifest["core.js"],
    latestCustomPanelJS: latestManifest["custom-panel.js"],

    es5AppJS: es5Manifest["app.js"],
    es5CoreJS: es5Manifest["core.js"],
    es5CustomPanelJS: es5Manifest["custom-panel.js"],
  });
  const minified = minifyHtml(content).replace(/#THEMEC/g, "{{ theme_color }}");

  fs.outputFileSync(
    path.resolve(paths.app_output_root, "index.html"),
    minified
  );
  done();
});

gulp.task("gen-index-cast-dev", (done) => {
  const contentReceiver = renderCastTemplate("receiver", {
    latestReceiverJS: "/frontend_latest/receiver.js",
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "receiver.html"),
    contentReceiver
  );

  const contentFAQ = renderCastTemplate("launcher-faq", {
    latestLauncherJS: "/frontend_latest/launcher.js",
    es5LauncherJS: "/frontend_es5/launcher.js",
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "faq.html"),
    contentFAQ
  );

  const contentLauncher = renderCastTemplate("launcher", {
    latestLauncherJS: "/frontend_latest/launcher.js",
    es5LauncherJS: "/frontend_es5/launcher.js",
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "index.html"),
    contentLauncher
  );
  done();
});

gulp.task("gen-index-cast-prod", (done) => {
  const latestManifest = require(path.resolve(
    paths.cast_output_latest,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    paths.cast_output_es5,
    "manifest.json"
  ));

  const contentReceiver = renderCastTemplate("receiver", {
    latestReceiverJS: latestManifest["receiver.js"],
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "receiver.html"),
    contentReceiver
  );

  const contentFAQ = renderCastTemplate("launcher-faq", {
    latestLauncherJS: latestManifest["launcher.js"],
    es5LauncherJS: es5Manifest["launcher.js"],
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "faq.html"),
    contentFAQ
  );

  const contentLauncher = renderCastTemplate("launcher", {
    latestLauncherJS: latestManifest["launcher.js"],
    es5LauncherJS: es5Manifest["launcher.js"],
  });
  fs.outputFileSync(
    path.resolve(paths.cast_output_root, "index.html"),
    contentLauncher
  );
  done();
});

gulp.task("gen-index-demo-dev", (done) => {
  const content = renderDemoTemplate("index", {
    latestDemoJS: "/frontend_latest/main.js",

    es5DemoJS: "/frontend_es5/main.js",
  });

  fs.outputFileSync(
    path.resolve(paths.demo_output_root, "index.html"),
    content
  );
  done();
});

gulp.task("gen-index-demo-prod", (done) => {
  const latestManifest = require(path.resolve(
    paths.demo_output_latest,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    paths.demo_output_es5,
    "manifest.json"
  ));
  const content = renderDemoTemplate("index", {
    latestDemoJS: latestManifest["main.js"],

    es5DemoJS: es5Manifest["main.js"],
  });
  const minified = minifyHtml(content);

  fs.outputFileSync(
    path.resolve(paths.demo_output_root, "index.html"),
    minified
  );
  done();
});

gulp.task("gen-index-gallery-dev", (done) => {
  const content = renderGalleryTemplate("index", {
    latestGalleryJS: "./frontend_latest/entrypoint.js",
  });

  fs.outputFileSync(
    path.resolve(paths.gallery_output_root, "index.html"),
    content
  );
  done();
});

gulp.task("gen-index-gallery-prod", (done) => {
  const latestManifest = require(path.resolve(
    paths.gallery_output_latest,
    "manifest.json"
  ));
  const content = renderGalleryTemplate("index", {
    latestGalleryJS: latestManifest["entrypoint.js"],
  });
  const minified = minifyHtml(content);

  fs.outputFileSync(
    path.resolve(paths.gallery_output_root, "index.html"),
    minified
  );
  done();
});

gulp.task("gen-index-hassio-dev", async () => {
  writeHassioEntrypoint("entrypoint.js", "entrypoints.js");
});

gulp.task("gen-index-hassio-prod", async () => {
  const latestManifest = require(path.resolve(
    paths.hassio_output_latest,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    paths.hassio_output_es5,
    "manifest.json"
  ));
  writeHassioEntrypoint(
    latestManifest["entrypoint.js"],
    es5Manifest["entrypoint.js"]
  );
});

function writeHassioEntrypoint(latestEntrypoint, es5Entrypoint) {
  fs.mkdirSync(paths.hassio_output_root, { recursive: true });
  fs.writeFileSync(
    path.resolve(paths.hassio_output_root, "entrypoint.js"),
    `
try {
  new Function("import('${paths.hassio_publicPath}/frontend_latest/${latestEntrypoint}')")();
} catch (err) {
  var el = document.createElement('script');
  el.src = '${paths.hassio_publicPath}/frontend_es5/${es5Entrypoint}';
  document.body.appendChild(el);
}
  `,
    { encoding: "utf-8" }
  );
}
