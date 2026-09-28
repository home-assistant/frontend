import { deleteSync } from "del";
import { mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import paths from "../paths.cjs";

const formatjsDir = join(paths.root_dir, "node_modules", "@formatjs");
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
    // use "pt" for "pt-BR", because "pt-BR" is unsupported by @formatjs
    const language = lang === "pt-BR" ? "pt" : lang;

    localeData = await readFile(
      join(formatjsDir, pkg, subDir, `${language}.js`),
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
  let data;
  try {
    runInNewContext(localeData, {
      Intl: {
        [INTL_POLYFILLS[pkg]]: {
          [addFunc]: (d) => {
            data = d;
          },
        },
      },
    });
  } catch (e) {
    throw Error(
      `Failed to evaluate data for language ${lang} from ${pkg}: ${e}`
    );
  }
  if (!data) {
    throw Error(`Failed to extract data for language ${lang} from ${pkg}`);
  }
  await writeFile(join(outDir, `${pkg}/${lang}.json`), JSON.stringify(data));
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
