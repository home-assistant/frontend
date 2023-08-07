import { deleteSync } from "del";
import { mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import path from "path";
import paths from "../paths.cjs";

const outDir = path.join(paths.build_dir, "locale-data");

const INTL_PACKAGES = {
  "intl-relativetimeformat": "RelativeTimeFormat",
  "intl-datetimeformat": "DateTimeFormat",
  "intl-numberformat": "NumberFormat",
  "intl-displaynames": "DisplayNames",
  "intl-listformat": "ListFormat",
};

const convertToJSON = async (pkg, lang) => {
  let localeData;
  try {
    localeData = await readFile(
      path.resolve(
        paths.polymer_dir,
        `node_modules/@formatjs/${pkg}/locale-data/${lang}.js`
      ),
      "utf-8"
    );
  } catch (e) {
    // Ignore if language is missing (i.e. not supported by @formatjs)
    if (e.code === "ENOENT") {
      return;
    } else {
      throw e;
    }
  }
  // Convert to JSON
  const className = INTL_PACKAGES[pkg];
  localeData = localeData
    .replace(
      new RegExp(
        `\\/\\*\\s*@generated\\s*\\*\\/\\s*\\/\\/\\s*prettier-ignore\\s*if\\s*\\(Intl\\.${className}\\s*&&\\s*typeof\\s*Intl\\.${className}\\.__addLocaleData\\s*===\\s*'function'\\)\\s*{\\s*Intl\\.${className}\\.__addLocaleData\\(`,
        "im"
      ),
      ""
    )
    .replace(/\)\s*}/im, "");
  // Parse to validate JSON, then stringify to minify
  localeData = JSON.stringify(JSON.parse(localeData));
  await writeFile(path.join(outDir, `${pkg}/${lang}.json`), localeData);
};

gulp.task("clean-locale-data", async () => deleteSync([outDir]));

gulp.task("create-locale-data", async () => {
  const translationMeta = JSON.parse(
    await readFile(
      path.resolve(paths.translations_src, "translationMetadata.json"),
      "utf-8"
    )
  );
  const conversions = [];
  for (const pkg of Object.keys(INTL_PACKAGES)) {
    await mkdir(path.join(outDir, pkg), { recursive: true });
    for (const lang of Object.keys(translationMeta)) {
      conversions.push(convertToJSON(pkg, lang));
    }
  }
  await Promise.all(conversions);
});

gulp.task(
  "build-locale-data",
  gulp.series("clean-locale-data", "create-locale-data")
);
