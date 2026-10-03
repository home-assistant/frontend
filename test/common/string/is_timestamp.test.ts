import { expect, test } from "vitest";
import { isTimestamp } from "../../../src/common/string/is_timestamp";

test("isTimestamp accepts valid timestamps", () => {
  expect(isTimestamp("2021-06-15T08:30:00Z")).toBe(true);
  expect(isTimestamp("2021-06-15 08:30:00")).toBe(true);
  expect(isTimestamp("2021-06-15T08:30")).toBe(true);
  expect(isTimestamp("2021-12-31T23:59:59")).toBe(true);
  expect(isTimestamp("2021-06-15T08:30:00.123+02:00")).toBe(true);
  expect(isTimestamp("2021-06-15T24:00")).toBe(true);
});

test("isTimestamp rejects non-timestamps", () => {
  expect(isTimestamp("not a date")).toBe(false);
  expect(isTimestamp("2021/06/15T08:30")).toBe(false);
  expect(isTimestamp("2021-13-01T00:00")).toBe(false);
  expect(isTimestamp("2021-00-01T00:00")).toBe(false);
  expect(isTimestamp("2021-06-32T00:00")).toBe(false);
  expect(isTimestamp("2021-06-15T25:00")).toBe(false);
});

test("isTimestamp does not allow a leading plus or minus", () => {
  expect(isTimestamp("+2021-06-15T08:30")).toBe(false);
  expect(isTimestamp("-2021-06-15T08:30")).toBe(false);
});

test("isTimestamp requires a time component after the date", () => {
  expect(isTimestamp("2021-06-15")).toBe(false);
});

test("isTimestamp rejects week-number dates", () => {
  expect(isTimestamp("2021-W24-2T08:30")).toBe(false);
});

test("isTimestamp rejects a year on its own", () => {
  expect(isTimestamp("2021")).toBe(false);
});
