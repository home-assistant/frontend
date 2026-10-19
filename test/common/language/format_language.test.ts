import { describe, expect, it } from "vitest";
import { formatLanguageCode } from "../../../src/common/language/format_language";
import type { FrontendLocaleData } from "../../../src/data/translation";

const zhHansLocale = { language: "zh-Hans" } as FrontendLocaleData;
const zhHantLocale = { language: "zh-Hant" } as FrontendLocaleData;
const enLocale = { language: "en" } as FrontendLocaleData;

const intlName = (languageCode: string, uiLanguage: string) =>
  new Intl.DisplayNames(uiLanguage, {
    type: "language",
    fallback: "code",
  }).of(languageCode);

describe("formatLanguageCode", () => {
  it("returns the Simplified Chinese display name for zh-TW in a Simplified Chinese UI", () => {
    expect(formatLanguageCode("zh-TW", zhHansLocale)).toBe("中文（中国台湾）");
  });

  it("returns the Traditional Chinese display name for zh-TW in a Traditional Chinese UI", () => {
    expect(formatLanguageCode("zh-TW", zhHantLocale)).toBe("中文（中國台灣）");
  });

  it("leaves regional Chinese UI locales to Intl.DisplayNames", () => {
    for (const uiLanguage of ["zh-TW", "zh-HK", "zh-Hant-TW"]) {
      expect(
        formatLanguageCode("zh-TW", {
          language: uiLanguage,
        } as FrontendLocaleData)
      ).toBe(intlName("zh-TW", uiLanguage));
    }
  });

  it("does not apply the Chinese override for other UI languages", () => {
    expect(formatLanguageCode("zh-TW", enLocale)).toBe(intlName("zh-TW", "en"));
  });

  it("falls back to Intl.DisplayNames for languages without an override", () => {
    expect(formatLanguageCode("de", zhHansLocale)).toBe(
      intlName("de", "zh-Hans")
    );
    expect(formatLanguageCode("zh-HK", zhHansLocale)).toBe(
      intlName("zh-HK", "zh-Hans")
    );
  });

  it("returns the code itself for unknown language codes", () => {
    expect(formatLanguageCode("not-a-locale", enLocale)).toBe("not-a-locale");
  });

  it("does not resolve inherited object members as overrides", () => {
    for (const languageCode of ["toString", "constructor", "__proto__"]) {
      const name = formatLanguageCode(languageCode, zhHansLocale);
      expect(typeof name).toBe("string");
      expect(name).not.toBe(Object.prototype.toString);
    }
  });
});
