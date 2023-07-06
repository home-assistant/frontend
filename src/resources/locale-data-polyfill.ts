// Loads the static locale data for a given language from FormatJS
// Parents need to load polyfills first; they are not imported here to avoid a circular reference

const loadedPolyfillLocale = new Set();

export const polyfillLocaleData = async (language: string) => {
  if (loadedPolyfillLocale.has(language)) {
    return;
  }
  loadedPolyfillLocale.add(language);
  try {
    if (
      Intl.NumberFormat &&
      // @ts-ignore
      typeof Intl.NumberFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `${__STATIC_PATH__}locale-data/intl-numberformat/${language}.json`
      );
      // @ts-ignore
      Intl.NumberFormat.__addLocaleData(await result.json());
    }
    if (
      Intl.RelativeTimeFormat &&
      // @ts-ignore
      typeof Intl.RelativeTimeFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `${__STATIC_PATH__}locale-data/intl-relativetimeformat/${language}.json`
      );
      // @ts-ignore
      Intl.RelativeTimeFormat.__addLocaleData(await result.json());
    }
    if (
      Intl.DateTimeFormat &&
      // @ts-ignore
      typeof Intl.DateTimeFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `${__STATIC_PATH__}locale-data/intl-datetimeformat/${language}.json`
      );
      // @ts-ignore
      Intl.DateTimeFormat.__addLocaleData(await result.json());
    }
    if (
      Intl.DisplayNames &&
      // @ts-ignore
      typeof Intl.DisplayNames.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `${__STATIC_PATH__}locale-data/intl-displaynames/${language}.json`
      );
      // @ts-ignore
      Intl.DisplayNames.__addLocaleData(await result.json());
    }
    if (
      Intl.ListFormat &&
      // @ts-ignore
      typeof Intl.ListFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `${__STATIC_PATH__}locale-data/intl-listformat/${language}.json`
      );
      // @ts-ignore
      Intl.ListFormat.__addLocaleData(await result.json());
    }
  } catch (e) {
    // Ignore
  }
};
