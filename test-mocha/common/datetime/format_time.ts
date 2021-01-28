import { assert } from "chai";

import {
  formatTime,
  formatTimeWithSeconds,
} from "../../../src/common/datetime/format_time";
import { NumberFormat } from "../../../src/data/translation";

describe("formatTime", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English times", () => {
    assert.strictEqual(
      formatTime(dateObj, { language: "en", number_format: NumberFormat.auto }),
      "11:12 AM"
    );
  });
});

describe("formatTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 400);

  it("Formats English times with seconds", () => {
    assert.strictEqual(
      formatTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.auto,
      }),
      "11:12:13 AM"
    );
  });
});
