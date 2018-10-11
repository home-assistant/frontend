import { assert } from "chai";

import formatDate from "../../../src/common/datetime/format_date";

describe("formatDate", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English dates", () => {
    assert.strictEqual(formatDate(dateObj, "en"), "November 18, 2017");
  });

  // Node only contains intl support for english formats. This test at least ensures
  // the fallback to a different locale
  it("Formats other dates", () => {
    assert.strictEqual(formatDate(dateObj, "fr"), "2017 M11 18");
  });
});
