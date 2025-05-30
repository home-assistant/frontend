import { deleteSync } from "del";
import { series } from "gulp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import paths from "../paths.ts";

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
  } catch (e: any) {
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

const cleanLocaleData = async () => deleteSync([outDir]);

const createLocaleData = async () => {
  const translationMeta = JSON.parse(
    await readFile(
      resolve(paths.translations_src, "translationMetadata.json"),
      "utf-8"
    )
  );
  const conversions: any[] = [];
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
};

export const buildLocaleData = series(cleanLocaleData, createLocaleData);
