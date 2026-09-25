import type { HassConfig } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import {
  calcDate,
  calcDateProperty,
  calcDateDifferenceProperty,
  shiftDateRange,
} from "../../../src/common/datetime/calc_date";
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

describe("shiftDateRange", () => {
  it("should shift date range correctly", () => {
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 0, 31);
    const result = shiftDateRange(startDate, endDate, true, locale, config);
    expect(result.start).toEqual(new Date(2024, 1, 1));
    expect(result.end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
  });
});
