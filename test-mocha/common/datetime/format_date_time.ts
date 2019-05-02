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
});
