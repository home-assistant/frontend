import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";

export const formatLanguageCode = (
  languageCode: string,
  locale: FrontendLocaleData
) => formatLanguageCodeMem(locale)?.of(languageCode) ?? languageCode;

const formatLanguageCodeMem = memoizeOne((locale: FrontendLocaleData) =>
  Intl && "DisplayNames" in Intl
    ? new Intl.DisplayNames(locale.language, {
        type: "language",
        fallback: "code",
      })
    : undefined
);
