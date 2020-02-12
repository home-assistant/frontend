import { assert } from "chai";

import { formatDate } from "../../../src/common/datetime/format_date";

describe("formatDate", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English dates", () => {
    assert.strictEqual(formatDate(dateObj, "en"), "November 18, 2017");
  });
});
