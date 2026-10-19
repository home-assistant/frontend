import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../../data/translation";

// Keep region naming internally consistent with the other entries shown in the
// language picker (for example zh-HK already renders as 中文（中国香港特别行政区）),
// instead of relying on whatever granularity the underlying CLDR data happens to use.
//
// The characters follow the script of the UI locale, so the entry never mixes
// Simplified and Traditional Chinese with the rest of the list.
const ZH_TW_NAME_HANS = "中文（中国台湾）";
const ZH_TW_NAME_HANT = "中文（中國台灣）";

// Only the UI locales shipped by the frontend are listed. Regional tags such as
// zh-Hant-TW or zh-HK (which can reach the picker through the navigator.language
// fallback) are intentionally left to Intl.DisplayNames, so the entry always
// follows the script of whatever locale produced the rest of the list.
const LANGUAGE_NAME_OVERRIDES: Record<
  string,
  Record<string, string> | undefined
> = {
  "zh-hans": { "zh-TW": ZH_TW_NAME_HANS },
  "zh-hant": { "zh-TW": ZH_TW_NAME_HANT },
};

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

const getLanguageNameOverride = (
  languageCode: string,
  uiLanguage: string
): string | undefined => {
  const uiKey = uiLanguage.toLowerCase();
  if (!hasOwn(LANGUAGE_NAME_OVERRIDES, uiKey)) {
    return undefined;
  }

  const table = LANGUAGE_NAME_OVERRIDES[uiKey];
  // Both lookups are restricted to own properties, so language codes such as
  // "toString" or "__proto__" can never resolve to an inherited Object member.
  return table && hasOwn(table, languageCode)
    ? table[languageCode]
    : undefined;
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
