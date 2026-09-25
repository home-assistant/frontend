import { describe, it, expect } from "vitest";
import { TimeFormat } from "../../../src/data/translation";
import { useAmPm } from "../../../src/common/datetime/use_am_pm";

describe("useAmPm", () => {
  it("should return true for am_pm format", () => {
    const locale = { time_format: TimeFormat.am_pm } as any;
    expect(useAmPm(locale)).toBe(true);
  });

  it("should return false for 24_hour format", () => {
    const locale = { time_format: TimeFormat.twenty_four } as any;
    expect(useAmPm(locale)).toBe(false);
  });

  it("should return true for language format with 12-hour clock", () => {
    const locale = {
      time_format: TimeFormat.language,
      language: "en-US",
    } as any;
    expect(useAmPm(locale)).toBe(true);
  });

  it("should return false for language format with 24-hour clock", () => {
    const locale = {
      time_format: TimeFormat.language,
      language: "fr-FR",
    } as any;
    expect(useAmPm(locale)).toBe(false);
  });
});
