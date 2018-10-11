import { assert } from "chai";

import secondsToDuration from "../../../src/common/datetime/seconds_to_duration.js";

describe("secondsToDuration", () => {
  it("works", () => {
    assert.strictEqual(secondsToDuration(0), null);
    assert.strictEqual(secondsToDuration(65), "1:05");
    assert.strictEqual(secondsToDuration(3665), "1:01:05");
    assert.strictEqual(secondsToDuration(39665), "11:01:05");
  });
});
