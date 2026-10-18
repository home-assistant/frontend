import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../../data/translation";

// Keep region naming internally consistent with the other entries shown in the
// language picker (for example zh-HK already renders as 中文（中国香港特别行政区）),
// instead of relying on whatever granularity the underlying CLDR data happens to use.
const LANGUAGE_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  zh: {
    "zh-TW": "中文（中国台湾）",
  },
};

const getLanguageNameOverride = (
  languageCode: string,
  uiLanguage: string
): string | undefined => {
  const base = uiLanguage.split("-")[0].toLowerCase();
  return LANGUAGE_NAME_OVERRIDES[base]?.[languageCode];
};

export const formatLanguageCode = (
  languageCode: string,
  locale: FrontendLocaleData
) => {
  const override = getLanguageNameOverride(languageCode, locale.language);
  if (override) {
    return override;
  }
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
