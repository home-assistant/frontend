import { deleteSync } from "del";
import { mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import { join, resolve } from "node:path";
import paths from "../paths.cjs";

const formatjsDir = join(paths.polymer_dir, "node_modules", "@formatjs");
const outDir = join(paths.build_dir, "locale-data");

const INTL_POLYFILLS = {
  "intl-datetimeformat": "DateTimeFormat",
  "intl-displaynames": "DisplayNames",
  "intl-listformat": "ListFormat",
  "intl-numberformat": "NumberFormat",
  "intl-relativetimeformat": "RelativeTimeFormat",
};

const convertToJSON = async (
  pkg,
  lang,
  subDir = "locale-data",
  addFunc = "__addLocaleData",
  skipMissing = true
) => {
  let localeData;
  try {
    localeData = await readFile(
      join(formatjsDir, pkg, subDir, `${lang}.js`),
      "utf-8"
    );
  } catch (e) {
    // Ignore if language is missing (i.e. not supported by @formatjs)
    if (e.code === "ENOENT" && skipMissing) {
      console.warn(`Skipped missing data for language ${lang} from ${pkg}`);
      return;
    }
    throw e;
  }
  // Convert to JSON
  const obj = INTL_POLYFILLS[pkg];
  const dataRegex = new RegExp(
    `Intl\\.${obj}\\.${addFunc}\\((?<data>.*)\\)`,
    "s"
  );
  localeData = localeData.match(dataRegex)?.groups?.data;
  if (!localeData) {
    throw Error(`Failed to extract data for language ${lang} from ${pkg}`);
  }
  // Parse to validate JSON, then stringify to minify
  localeData = JSON.stringify(JSON.parse(localeData));
  await writeFile(join(outDir, `${pkg}/${lang}.json`), localeData);
};

gulp.task("clean-locale-data", async () => deleteSync([outDir]));

gulp.task("create-locale-data", async () => {
  const translationMeta = JSON.parse(
    await readFile(
      resolve(paths.translations_src, "translationMetadata.json"),
      "utf-8"
    )
  );
  const conversions = [];
  for (const pkg of Object.keys(INTL_POLYFILLS)) {
    // eslint-disable-next-line no-await-in-loop
    await mkdir(join(outDir, pkg), { recursive: true });
    for (const lang of Object.keys(translationMeta)) {
      conversions.push(convertToJSON(pkg, lang));
    }
  }
  conversions.push(
    convertToJSON(
      "intl-datetimeformat",
      "add-all-tz",
      ".",
      "__addTZData",
      false
    )
  );
  await Promise.all(conversions);
});

gulp.task(
  "build-locale-data",
  gulp.series("clean-locale-data", "create-locale-data")
);
