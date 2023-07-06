import { deleteSync } from "del";
import fs from "fs";
import gulp from "gulp";
import path from "path";
import paths from "../paths.cjs";

const outDir = "build/locale-data";

gulp.task("clean-locale-data", async () => deleteSync([outDir]));

gulp.task("ensure-locale-data-build-dir", async () => {
  fs.mkdirSync(outDir, { recursive: true });
});

const modules = {
  "intl-relativetimeformat": "RelativeTimeFormat",
  "intl-datetimeformat": "DateTimeFormat",
  "intl-numberformat": "NumberFormat",
  "intl-displaynames": "DisplayNames",
  "intl-listformat": "ListFormat",
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
        const localeData = fs
          .readFileSync(
            path.resolve(
              paths.polymer_dir,
              `node_modules/@formatjs/${module}/locale-data/${lang}.js`
            ),
            "utf-8"
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
        fs.mkdirSync(path.join(outDir, module), { recursive: true });
        fs.writeFileSync(
          path.join(outDir, `${module}/${lang}.json`),
          localeData
        );
      } catch (e) {
        if (e.code !== "ENOENT") {
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
