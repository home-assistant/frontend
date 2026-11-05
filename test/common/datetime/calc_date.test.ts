import type { HassConfig } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import {
  calcDate,
  calcDateProperty,
  calcDateDifferenceProperty,
  shiftDateRange,
  shiftToServerTimeZone,
} from "../../../src/common/datetime/calc_date";
import { LOCAL_TIME_ZONE } from "../../../src/common/datetime/resolve-time-zone";
import {
  type FrontendLocaleData,
  TimeZone,
} from "../../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en-US",
  time_zone: TimeZone.local,
} as any;
const localeServer: FrontendLocaleData = {
  language: "en-US",
  time_zone: TimeZone.server,
} as any;
const config: HassConfig = { time_zone: "UTC" } as any;

describe("calcDate", () => {
  it("should calculate date correctly", () => {
    const date = new Date(2024, 1, 28);
    const result = calcDate(date, addDays, locale, config, 1);
    expect(result).toEqual(new Date(2024, 1, 29));
  });
  it("should calculate date correctly with server time zone", () => {
    const date = new Date(2024, 1, 28);
    const result = calcDate(date, addDays, localeServer, config, 1);
    expect(result).toEqual(new Date(2024, 1, 29));
  });
});

describe("calcDateProperty", () => {
  it("should calculate date property correctly", () => {
    const date = new Date(2023, 0, 1);
    const options = "test-options";
    const result = calcDateProperty(
      date,
      (d, o) => (o === options ? d.getDate() : false),
      locale,
      config,
      options
    );
    expect(result).toBe(1);
  });
});

describe("calcDateDifferenceProperty", () => {
  it("should calculate date difference property correctly", () => {
    const startDate = new Date(2023, 0, 1);
    const endDate = new Date(2023, 0, 2);
    const result = calcDateDifferenceProperty(
      endDate,
      startDate,
      (d, o) => d.getDate() - o.getDate(),
      locale,
      config
    );
    expect(result).toBe(1);
  });
});

describe("shiftToServerTimeZone", () => {
  it("keeps the wall-clock time in a server time zone ahead", () => {
    const sofia = { time_zone: "Europe/Sofia" } as HassConfig;
    expect(shiftToServerTimeZone(new Date(2026, 8, 18), locale, sofia)).toEqual(
      new Date("2026-09-18T00:00:00+03:00")
    );
    expect(
      shiftToServerTimeZone(
        new Date(2026, 8, 21, 23, 59, 59, 999),
        locale,
        sofia
      )
    ).toEqual(new Date("2026-09-21T23:59:59.999+03:00"));
  });

  it("keeps the wall-clock time in a server time zone behind", () => {
    const newYork = { time_zone: "America/New_York" } as HassConfig;
    expect(
      shiftToServerTimeZone(new Date(2026, 8, 18), locale, newYork)
    ).toEqual(new Date("2026-09-18T00:00:00-04:00"));
  });

  it("leaves dates alone when they are already in the server time zone", () => {
    const date = new Date(2026, 8, 18);
    const sofia = { time_zone: "Europe/Sofia" } as HassConfig;
    expect(shiftToServerTimeZone(date, localeServer, sofia)).toBe(date);
    expect(
      shiftToServerTimeZone(date, locale, {
        time_zone: LOCAL_TIME_ZONE,
      } as HassConfig)
    ).toBe(date);
  });

  it("leaves dates alone when Intl can't resolve time zone offsets", () => {
    const realDateTimeFormat = Intl.DateTimeFormat;
    // Like Chrome < 95 and Safari < 15.4, which lack "longOffset".
    Intl.DateTimeFormat = new Proxy(realDateTimeFormat, {
      construct(target, args) {
        if (args[1]?.timeZoneName === "longOffset") {
          throw new RangeError("Invalid timeZoneName");
        }
        return Reflect.construct(target, args);
      },
    });
    try {
      const date = new Date(2026, 8, 18);
      expect(
        shiftToServerTimeZone(date, locale, {
          time_zone: "Asia/Tokyo",
        } as HassConfig)
      ).toBe(date);
    } finally {
      Intl.DateTimeFormat = realDateTimeFormat;
    }
  });
});

describe("shiftDateRange", () => {
  it("should shift date range correctly", () => {
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 0, 31);
    const result = shiftDateRange(startDate, endDate, true, locale, config);
    expect(result.start).toEqual(new Date(2024, 1, 1));
    expect(result.end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
  });
});
