import { describe, expect, it } from "vitest";
import { formatLanguageCode } from "../../../src/common/language/format_language";
import type { FrontendLocaleData } from "../../../src/data/translation";

const zhLocale = { language: "zh-Hans" } as FrontendLocaleData;
const zhHantLocale = { language: "zh-Hant" } as FrontendLocaleData;
const enLocale = { language: "en" } as FrontendLocaleData;

const intlName = (languageCode: string, uiLanguage: string) =>
  new Intl.DisplayNames(uiLanguage, {
    type: "language",
    fallback: "code",
  }).of(languageCode);

describe("formatLanguageCode", () => {
  it("returns the Chinese display name for zh-TW in Chinese UI locales", () => {
    expect(formatLanguageCode("zh-TW", zhLocale)).toBe("中文（中国台湾）");
    expect(formatLanguageCode("zh-TW", zhHantLocale)).toBe("中文（中国台湾）");
  });

  it("does not apply the Chinese override for other UI languages", () => {
    expect(formatLanguageCode("zh-TW", enLocale)).toBe(intlName("zh-TW", "en"));
  });

  it("falls back to Intl.DisplayNames for languages without an override", () => {
    expect(formatLanguageCode("de", zhLocale)).toBe(intlName("de", "zh-Hans"));
    expect(formatLanguageCode("zh-HK", zhLocale)).toBe(
      intlName("zh-HK", "zh-Hans")
    );
  });

  it("returns the code itself for unknown language codes", () => {
    expect(formatLanguageCode("not-a-locale", enLocale)).toBe("not-a-locale");
  });
});
