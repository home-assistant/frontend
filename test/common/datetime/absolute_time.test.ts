import type { HassConfig } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import { absoluteTime } from "../../../src/common/datetime/absolute_time";
import {
  TimeFormat,
  TimeZone,
  type FrontendLocaleData,
} from "../../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en-US",
  time_zone: TimeZone.server,
  time_format: TimeFormat.twenty_four,
} as any;
const config: HassConfig = { time_zone: "UTC" } as any;

describe("absoluteTime", () => {
  it("should format time correctly for same day", () => {
    const from = new Date();
    from.setUTCHours(13, 23);
    const result = absoluteTime(from, locale, config);
    expect(result).toBe("13:23");
  });

  it("should format date correctly for same year", () => {
    const from = new Date();
    from.setUTCMonth(9, 20);
    from.setUTCHours(13, 23);
    const result = absoluteTime(from, locale, config);
    expect(result).toBe("Oct 20, 13:23");
  });

  it("should format date with year correctly", () => {
    const from = new Date(2024, 1, 29, 13, 23);
    const result = absoluteTime(from, locale, config);
    expect(result).toBe("Feb 29, 2024, 13:23");
  });
});
