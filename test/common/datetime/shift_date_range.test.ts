import { describe, it, expect } from "vitest";
import { shiftDateRange } from "../../../src/common/datetime/calc_date";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";

const mockConfig = {
  time_zone: "America/New_York",
};

describe("shiftDateRange", () => {
  const locale = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  };

  it("shifts date range forward month", () => {
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 0, 31);
    const result = shiftDateRange(startDate, endDate, true, locale, mockConfig);
    expect(result.start).toEqual(new Date(2024, 1, 1));
    expect(result.end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
  });

  it("shifts date range backward month", () => {
    const startDate = new Date(2025, 0, 1);
    const endDate = new Date(2025, 0, 31);
    const result = shiftDateRange(
      startDate,
      endDate,
      false,
      locale,
      mockConfig
    );
    expect(result.start).toEqual(new Date(2024, 11, 1));
    expect(result.end).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999));
  });

  it("shifts date range forward day", () => {
    const startDate = new Date(2025, 0, 1);
    const endDate = new Date(new Date(2025, 0, 1, 23, 59, 59, 999));
    const result = shiftDateRange(startDate, endDate, true, locale, mockConfig);
    expect(result.start).toEqual(new Date(2025, 0, 2));
    expect(result.end).toEqual(new Date(2025, 0, 2, 23, 59, 59, 999));
  });

  it("shifts date range backward day", () => {
    const startDate = new Date(2025, 0, 2);
    const endDate = new Date(new Date(2025, 0, 2, 23, 59, 59, 999));
    const result = shiftDateRange(
      startDate,
      endDate,
      false,
      locale,
      mockConfig
    );
    expect(result.start).toEqual(new Date(2025, 0, 1));
    expect(result.end).toEqual(new Date(2025, 0, 1, 23, 59, 59, 999));
  });
});
