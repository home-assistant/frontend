import { assert } from "chai";

import millisecondsToDuration from "../../../src/common/datetime/milliseconds_to_duration";

describe("millisecondsToDuration", () => {
  it("works", () => {
    assert.strictEqual(millisecondsToDuration(0), null);
    assert.strictEqual(millisecondsToDuration(1), "0.001");
    assert.strictEqual(millisecondsToDuration(10), "0.010");
    assert.strictEqual(millisecondsToDuration(100), "0.100");
    assert.strictEqual(millisecondsToDuration(1000), "1");
    assert.strictEqual(millisecondsToDuration(1001), "1.001");
    assert.strictEqual(millisecondsToDuration(65000), "1:05");
    assert.strictEqual(millisecondsToDuration(3665000), "1:01:05");
    assert.strictEqual(millisecondsToDuration(39665050), "11:01:05");
    assert.strictEqual(millisecondsToDuration(932093000), "258:54:53");
  });
});
