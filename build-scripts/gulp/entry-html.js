// Tasks to generate entry HTML
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const gulp = require("gulp");
const fs = require("fs-extra");
const path = require("path");
const template = require("lodash.template");
const minify = require("html-minifier").minify;
const config = require("../paths.js");

const templatePath = (tpl) =>
  path.resolve(config.polymer_dir, "src/html/", `${tpl}.html.template`);

const readFile = (pth) => fs.readFileSync(pth).toString();

const renderTemplate = (pth, data = {}, pathFunc = templatePath) => {
  const compiled = template(readFile(pathFunc(pth)));
  return compiled({ ...data, renderTemplate });
};

const renderDemoTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(config.demo_dir, "src/html/", `${tpl}.html.template`)
  );

const renderCastTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(config.cast_dir, "src/html/", `${tpl}.html.template`)
  );

const renderGalleryTemplate = (pth, data = {}) =>
  renderTemplate(pth, data, (tpl) =>
    path.resolve(config.gallery_dir, "src/html/", `${tpl}.html.template`)
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
      latestHassIconsJS: "/frontend_latest/hass-icons.js",

      es5Compatibility: "/frontend_es5/compatibility.js",
      es5PageJS: `/frontend_es5/${page}.js`,
      es5HassIconsJS: "/frontend_es5/hass-icons.js",
    });

    fs.outputFileSync(path.resolve(config.root, `${page}.html`), content);
  }
  done();
});

gulp.task("gen-pages-prod", (done) => {
  const latestManifest = require(path.resolve(config.output, "manifest.json"));
  const es5Manifest = require(path.resolve(config.output_es5, "manifest.json"));

  for (const page of PAGES) {
    const content = renderTemplate(page, {
      latestPageJS: latestManifest[`${page}.js`],
      latestHassIconsJS: latestManifest["hass-icons.js"],

      es5Compatibility: es5Manifest["compatibility.js"],
      es5PageJS: es5Manifest[`${page}.js`],
      es5HassIconsJS: es5Manifest["hass-icons.js"],
    });

    fs.outputFileSync(
      path.resolve(config.root, `${page}.html`),
      minifyHtml(content)
    );
  }
  done();
});

gulp.task("gen-index-app-dev", (done) => {
  // In dev mode we don't mangle names, so we hardcode urls. That way we can
  // run webpack as last in watch mode, which blocks output.
  const content = renderTemplate("index", {
    latestAppJS: "/frontend_latest/app.js",
    latestCoreJS: "/frontend_latest/core.js",
    latestCustomPanelJS: "/frontend_latest/custom-panel.js",
    latestHassIconsJS: "/frontend_latest/hass-icons.js",

    es5Compatibility: "/frontend_es5/compatibility.js",
    es5AppJS: "/frontend_es5/app.js",
    es5CoreJS: "/frontend_es5/core.js",
    es5CustomPanelJS: "/frontend_es5/custom-panel.js",
    es5HassIconsJS: "/frontend_es5/hass-icons.js",
  }).replace(/#THEMEC/g, "{{ theme_color }}");

  fs.outputFileSync(path.resolve(config.root, "index.html"), content);
  done();
});

gulp.task("gen-index-app-prod", (done) => {
  const latestManifest = require(path.resolve(config.output, "manifest.json"));
  const es5Manifest = require(path.resolve(config.output_es5, "manifest.json"));
  const content = renderTemplate("index", {
    latestAppJS: latestManifest["app.js"],
    latestCoreJS: latestManifest["core.js"],
    latestCustomPanelJS: latestManifest["custom-panel.js"],
    latestHassIconsJS: latestManifest["hass-icons.js"],

    es5Compatibility: es5Manifest["compatibility.js"],
    es5AppJS: es5Manifest["app.js"],
    es5CoreJS: es5Manifest["core.js"],
    es5CustomPanelJS: es5Manifest["custom-panel.js"],
    es5HassIconsJS: es5Manifest["hass-icons.js"],
  });
  const minified = minifyHtml(content).replace(/#THEMEC/g, "{{ theme_color }}");

  fs.outputFileSync(path.resolve(config.root, "index.html"), minified);
  done();
});

gulp.task("gen-index-cast-dev", (done) => {
  const contentReceiver = renderCastTemplate("receiver", {
    latestReceiverJS: "/frontend_latest/receiver.js",
  });
  fs.outputFileSync(
    path.resolve(config.cast_root, "receiver.html"),
    contentReceiver
  );

  const contentFAQ = renderCastTemplate("launcher-faq", {
    latestLauncherJS: "/frontend_latest/launcher.js",
    es5LauncherJS: "/frontend_es5/launcher.js",
  });
  fs.outputFileSync(path.resolve(config.cast_root, "faq.html"), contentFAQ);

  const contentLauncher = renderCastTemplate("launcher", {
    latestLauncherJS: "/frontend_latest/launcher.js",
    es5LauncherJS: "/frontend_es5/launcher.js",
  });
  fs.outputFileSync(
    path.resolve(config.cast_root, "index.html"),
    contentLauncher
  );
  done();
});

gulp.task("gen-index-cast-prod", (done) => {
  const latestManifest = require(path.resolve(
    config.cast_output,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    config.cast_output_es5,
    "manifest.json"
  ));

  const contentReceiver = renderCastTemplate("receiver", {
    latestReceiverJS: latestManifest["receiver.js"],
  });
  fs.outputFileSync(
    path.resolve(config.cast_root, "receiver.html"),
    contentReceiver
  );

  const contentFAQ = renderCastTemplate("launcher-faq", {
    latestLauncherJS: latestManifest["launcher.js"],
    es5LauncherJS: es5Manifest["launcher.js"],
  });
  fs.outputFileSync(path.resolve(config.cast_root, "faq.html"), contentFAQ);

  const contentLauncher = renderCastTemplate("launcher", {
    latestLauncherJS: latestManifest["launcher.js"],
    es5LauncherJS: es5Manifest["launcher.js"],
  });
  fs.outputFileSync(
    path.resolve(config.cast_root, "index.html"),
    contentLauncher
  );
  done();
});

gulp.task("gen-index-demo-dev", (done) => {
  // In dev mode we don't mangle names, so we hardcode urls. That way we can
  // run webpack as last in watch mode, which blocks output.
  const content = renderDemoTemplate("index", {
    latestDemoJS: "/frontend_latest/main.js",

    es5Compatibility: "/frontend_es5/compatibility.js",
    es5DemoJS: "/frontend_es5/main.js",
  });

  fs.outputFileSync(path.resolve(config.demo_root, "index.html"), content);
  done();
});

gulp.task("gen-index-demo-prod", (done) => {
  const latestManifest = require(path.resolve(
    config.demo_output,
    "manifest.json"
  ));
  const es5Manifest = require(path.resolve(
    config.demo_output_es5,
    "manifest.json"
  ));
  const content = renderDemoTemplate("index", {
    latestDemoJS: latestManifest["main.js"],

    es5Compatibility: es5Manifest["compatibility.js"],
    es5DemoJS: es5Manifest["main.js"],
  });
  const minified = minifyHtml(content);

  fs.outputFileSync(path.resolve(config.demo_root, "index.html"), minified);
  done();
});

gulp.task("gen-index-gallery-dev", (done) => {
  // In dev mode we don't mangle names, so we hardcode urls. That way we can
  // run webpack as last in watch mode, which blocks output.
  const content = renderGalleryTemplate("index", {
    latestGalleryJS: "./entrypoint.js",
  });

  fs.outputFileSync(path.resolve(config.gallery_root, "index.html"), content);
  done();
});

gulp.task("gen-index-gallery-prod", (done) => {
  const latestManifest = require(path.resolve(
    config.gallery_output,
    "manifest.json"
  ));
  const content = renderGalleryTemplate("index", {
    latestGalleryJS: latestManifest["entrypoint.js"],
  });
  const minified = minifyHtml(content);

  fs.outputFileSync(path.resolve(config.gallery_root, "index.html"), minified);
  done();
});
