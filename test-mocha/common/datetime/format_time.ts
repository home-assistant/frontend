import { assert } from "chai";

import {
  formatTime,
  formatTimeWithSeconds,
} from "../../../src/common/datetime/format_time";

describe("formatTime", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English times", () => {
    assert.strictEqual(formatTime(dateObj, "en"), "11:12 AM");
  });
});

describe("formatTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 400);

  it("Formats English times with seconds", () => {
    assert.strictEqual(formatTimeWithSeconds(dateObj, "en"), "11:12:13 AM");
  });
});
