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

const ZH_HANS_OVERRIDES: Record<string, string> = { "zh-tw": ZH_TW_NAME_HANS };
const ZH_HANT_OVERRIDES: Record<string, string> = { "zh-tw": ZH_TW_NAME_HANT };

// Only the UI locales shipped by the frontend are listed, plus the bare "zh"
// that a browser can report through the navigator.language fallback in the
// picker. A bare "zh" resolves to Simplified, which is what Intl.Locale
// maximizes it to as well.
//
// Regional tags such as zh-Hant-TW or zh-HK are intentionally left to
// Intl.DisplayNames, so the entry always follows the script of whatever locale
// produced the rest of the list. Keys are lowercase because BCP 47 tags are
// case-insensitive.
const LANGUAGE_NAME_OVERRIDES: Record<
  string,
  Record<string, string> | undefined
> = {
  zh: ZH_HANS_OVERRIDES,
  "zh-hans": ZH_HANS_OVERRIDES,
  "zh-hant": ZH_HANT_OVERRIDES,
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
  const codeKey = languageCode.toLowerCase();
  // Both lookups are restricted to own properties, so language codes such as
  // "toString" or "__proto__" can never resolve to an inherited Object member.
  return table && hasOwn(table, codeKey) ? table[codeKey] : undefined;
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
