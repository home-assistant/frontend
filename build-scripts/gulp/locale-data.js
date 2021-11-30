/* eslint-disable @typescript-eslint/no-var-requires */

const del = require("del");
const path = require("path");
const gulp = require("gulp");
const fs = require("fs");
const paths = require("../paths");

const outDir = "build/locale-data";

gulp.task("clean-locale-data", () => del([outDir]));

gulp.task("ensure-locale-data-build-dir", (done) => {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  done();
});

const modules = {
  "intl-relativetimeformat": "RelativeTimeFormat",
  "intl-datetimeformat": "DateTimeFormat",
  "intl-numberformat": "NumberFormat",
};

gulp.task("create-locale-data", (done) => {
  const translationMeta = JSON.parse(
    fs.readFileSync(
      path.join(paths.translations_src, "translationMetadata.json")
    )
  );
  Object.entries(modules).forEach(([module, className]) => {
    Object.keys(translationMeta).forEach((lang) => {
      try {
        const localeData = String(
          fs.readFileSync(
            require.resolve(`@formatjs/${module}/locale-data/${lang}.js`)
          )
        )
          .replace(
            new RegExp(
              `\\/\\*\\s*@generated\\s*\\*\\/\\s*\\/\\/\\s*prettier-ignore\\s*if\\s*\\(Intl\\.${className}\\s*&&\\s*typeof\\s*Intl\\.${className}\\.__addLocaleData\\s*===\\s*'function'\\)\\s*{\\s*Intl\\.${className}\\.__addLocaleData\\(`,
              "im"
            ),
            ""
          )
          .replace(/\)\s*}/im, "");
        // make sure we have valid JSON
        JSON.parse(localeData);
        if (!fs.existsSync(path.join(outDir, module))) {
          fs.mkdirSync(path.join(outDir, module), { recursive: true });
        }
        fs.writeFileSync(
          path.join(outDir, `${module}/${lang}.json`),
          localeData
        );
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") {
          throw e;
        }
      }
    });
    done();
  });
});

gulp.task(
  "build-locale-data",
  gulp.series(
    "clean-locale-data",
    "ensure-locale-data-build-dir",
    "create-locale-data"
  )
);
