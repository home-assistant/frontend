// Loads the static locale data for a given language from FormatJS
// Parents need to load polyfills first; they are not imported here to avoid a circular reference

const INTL_POLYFILLS = [
  "DateTimeFormat",
  "DisplayNames",
  "ListFormat",
  "NumberFormat",
  "RelativeTimeFormat",
] as const satisfies readonly (keyof typeof Intl)[];

const loadedLocales: Set<string> = new Set();

const addData = async (
  obj: (typeof INTL_POLYFILLS)[number],
  language: string
) => {
  // Add function will only exist if constructor is polyfilled
  if (typeof (Intl[obj] as any)?.__addLocaleData === "function") {
    const result = await fetch(
      `${__STATIC_PATH__}locale-data/intl-${obj.toLowerCase()}/${language}.json`
    );
    // Ignore if polyfill data does not exist for language
    if (result.status !== 404) {
      (Intl[obj] as any).__addLocaleData(await result.json());
    }
  }
};

export const polyfillLocaleData = async (language: string) => {
  if (loadedLocales.has(language)) {
    return;
  }
  loadedLocales.add(language);
  await Promise.all(INTL_POLYFILLS.map((obj) => addData(obj, language)));
};
