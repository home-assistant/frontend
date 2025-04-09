import type { FrontendLocaleData } from "../../data/translation";

import memoizeOne from "memoize-one";

export const formatLanguageCode = (
  languageCode: string,
  locale: FrontendLocaleData
) => {
  try {
    return formatLanguageCodeMem(locale)?.of(languageCode) ?? languageCode;
  } catch {
    return languageCode;
  }
};

const formatLanguageCodeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DisplayNames(locale.language, {
      type: "language",
      fallback: "code",
    })
);
