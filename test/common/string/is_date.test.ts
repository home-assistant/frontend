import { expect, test } from "vitest";
import { isDate } from "../../../src/common/string/is_date";

test("isDate", () => {
  expect(isDate("ABC")).toBe(false);

  expect(isDate("2021-02-03", false)).toBe(true);
  expect(isDate("2021-02-03", true)).toBe(true);

  expect(isDate("2021-05-25T19:23:52+00:00", true)).toBe(true);
  expect(isDate("2021-05-25T19:23:52+00:00", false)).toBe(false);
});
