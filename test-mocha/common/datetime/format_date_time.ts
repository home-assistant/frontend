import { assert } from "chai";

import formatDateTime from "../../../src/common/datetime/format_date_time";

describe("formatDateTime", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English date times", () => {
    assert.strictEqual(
      formatDateTime(dateObj, "en"),
      "November 18, 2017, 11:12 AM"
    );
  });

  // Node only contains intl support for english formats. This test at least ensures
  // the fallback to a different locale
  it("Formats other date times", () => {
    assert.strictEqual(formatDateTime(dateObj, "fr"), "2017 M11 18 11:12");
  });
});
