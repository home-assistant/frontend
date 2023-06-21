import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";

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

const formatLanguageCodeMem = memoizeOne((locale: FrontendLocaleData) =>
  Intl && "DisplayNames" in Intl
    ? new Intl.DisplayNames(locale.language, {
        type: "language",
        fallback: "code",
      })
    : undefined
);
