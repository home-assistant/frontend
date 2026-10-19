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

const LANGUAGE_NAME_OVERRIDES: Record<
  string,
  Record<string, string> | undefined
> = {
  zh: { "zh-TW": ZH_TW_NAME_HANS },
  "zh-hans": { "zh-TW": ZH_TW_NAME_HANS },
  "zh-hant": { "zh-TW": ZH_TW_NAME_HANT },
};

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

const getLanguageNameOverride = (
  languageCode: string,
  uiLanguage: string
): string | undefined => {
  const normalized = uiLanguage.toLowerCase();
  const base = normalized.split("-")[0];

  // Prefer the table registered for the exact UI locale, then the one for its
  // base language. Every lookup is restricted to own properties, so language
  // codes such as "toString" or "__proto__" can never resolve to an inherited
  // Object member.
  const tables = [normalized, base].map((key) =>
    hasOwn(LANGUAGE_NAME_OVERRIDES, key)
      ? LANGUAGE_NAME_OVERRIDES[key]
      : undefined
  );

  for (const table of tables) {
    if (table && hasOwn(table, languageCode)) {
      return table[languageCode];
    }
  }

  return undefined;
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
