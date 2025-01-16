import { describe, it, expect } from "vitest";
import {
  firstWeekday,
  firstWeekdayIndex,
} from "../../../src/common/datetime/first_weekday";
import {
  type FrontendLocaleData,
  FirstWeekday,
} from "../../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en-US",
  first_weekday: FirstWeekday.language,
} as any;
const mondayLocale: FrontendLocaleData = {
  language: "en-US",
  first_weekday: FirstWeekday.monday,
} as any;

describe("firstWeekday", () => {
  it("should return the correct weekday based on locale", () => {
    expect(firstWeekday(locale)).toBe("sunday");
  });

  it("should return the correct weekday index based on locale", () => {
    expect(firstWeekdayIndex(locale)).toBe(0);
  });

  it("should return the correct weekday when first_weekday is specified", () => {
    expect(firstWeekday(mondayLocale)).toBe("monday");
  });

  it("should return the correct weekday index when first_weekday is specified", () => {
    expect(firstWeekdayIndex(mondayLocale)).toBe(1);
  });

  it("should return the default weekday when first_weekday is not valid", () => {
    expect(
      firstWeekdayIndex({ language: "en-US", first_weekday: "invalid" } as any)
    ).toBe(1);
  });
});
