import { expect, test } from "vitest";
import { TZDate } from "@date-fns/tz";
import { isDate } from "../../../src/common/string/is_date";

/**
 * These tests verify that all-day event dates are correctly identified
 * and can be distinguished from datetime strings. This is critical for
 * proper date display in the calendar event detail dialog.
 */

test("isDate correctly identifies date-only strings", () => {
  // Valid date-only strings (all-day events)
  expect(isDate("2025-10-10")).toBe(true);
  expect(isDate("2007-06-28")).toBe(true);
  expect(isDate("2025-12-31")).toBe(true);

  // DateTime strings should not be identified as dates
  expect(isDate("2025-10-10T00:00:00")).toBe(false);
  expect(isDate("2025-10-10T14:30:00")).toBe(false);
  expect(isDate("2025-10-10T14:30:00Z")).toBe(false);
  expect(isDate("2025-10-10T14:30:00+00:00")).toBe(false);
  expect(isDate("2025-10-10T14:30:00-08:00")).toBe(false);
});

test("Date parsing for all-day events", () => {
  // Verify that date-only strings can be parsed as local dates
  const dateStr = "2025-10-10";
  const parsed = new Date(dateStr + "T00:00:00");

  expect(parsed.getFullYear()).toBe(2025);
  expect(parsed.getMonth()).toBe(9); // October (0-indexed)
  expect(parsed.getDate()).toBe(10);
});

test("Timed events respect timezone conversion", () => {
  // Verify that datetime strings with timezone info are properly converted with TZDate
  const datetimeStr = "2025-10-10T14:30:00-07:00"; // 2:30 PM Pacific time
  const timeZone = "America/Los_Angeles"; // UTC-7 (PDT) in October

  // This should NOT be identified as a date-only string
  expect(isDate(datetimeStr)).toBe(false);

  // Timed events should use TZDate which respects timezone
  const tzDate = new TZDate(datetimeStr, timeZone);

  // The date should be October 10, 2:30 PM in LA timezone
  expect(tzDate.getFullYear()).toBe(2025);
  expect(tzDate.getMonth()).toBe(9); // October (0-indexed)
  expect(tzDate.getDate()).toBe(10);
  expect(tzDate.getHours()).toBe(14);
  expect(tzDate.getMinutes()).toBe(30);
});

test("Timed events display different day due to timezone offset", () => {
  // An event at 1 AM UTC on October 10 should display as October 9 in Pacific time
  const utcDatetimeStr = "2025-10-10T01:00:00Z";
  const timeZone = "America/Los_Angeles"; // UTC-7 (PDT) in October

  // This should NOT be identified as a date-only string
  expect(isDate(utcDatetimeStr)).toBe(false);

  // Parse the UTC datetime in Pacific timezone
  const tzDate = new TZDate(utcDatetimeStr, timeZone);

  // Due to the -7 hour offset, 1 AM UTC becomes 6 PM on the previous day in Pacific
  expect(tzDate.getFullYear()).toBe(2025);
  expect(tzDate.getMonth()).toBe(9); // October (0-indexed)
  expect(tzDate.getDate()).toBe(9); // Previous day
  expect(tzDate.getHours()).toBe(18); // 6 PM
  expect(tzDate.getMinutes()).toBe(0);
});
