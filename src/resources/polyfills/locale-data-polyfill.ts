// Loads the static locale data for a given language from FormatJS
// Parents need to load polyfills first; they are not imported here to avoid a circular reference

const INTL_POLYFILLS = [
  "DateTimeFormat",
  "DisplayNames",
  "ListFormat",
  "NumberFormat",
  "RelativeTimeFormat",
] as const satisfies readonly (keyof typeof Intl)[];

const loadedLocales = new Set<string>();

const addData = async (
  obj: (typeof INTL_POLYFILLS)[number],
  language: string,
  addFunc = "__addLocaleData"
) => {
  // Add function will only exist if constructor is polyfilled
  if (typeof (Intl[obj] as any)?.[addFunc] !== "function") {
    return;
  }
  const url = `${__STATIC_PATH__}locale-data/intl-${obj.toLowerCase()}/${language}.json`;
  try {
    const result = await fetch(url);
    // 404 means polyfill data does not exist for the language; ignore silently.
    if (result.ok) {
      (Intl[obj] as any)[addFunc](await result.json());
    }
  } catch (err) {
    // Network/access-control failures should not block startup, but they
    // degrade i18n features so surface a warning for diagnostics.
    // eslint-disable-next-line no-console
    console.warn(`Failed to load Intl.${obj} locale data for ${language}`, {
      url,
      error: err,
    });
  }
};

export const polyfillLocaleData = async (language: string) => {
  if (loadedLocales.has(language)) {
    return;
  }
  loadedLocales.add(language);
  await Promise.all(INTL_POLYFILLS.map((obj) => addData(obj, language)));
};

export const polyfillTimeZoneData = () =>
  addData("DateTimeFormat", "add-all-tz", "__addTZData");
