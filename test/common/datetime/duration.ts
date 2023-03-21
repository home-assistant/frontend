import { assert } from "chai";

import { formatDuration } from "../../../src/common/datetime/duration";

describe("formatDuration", () => {
  it("works", () => {
    assert.strictEqual(formatDuration("0", "ms"), "0");
    assert.strictEqual(formatDuration("1", "ms"), "0.001");
    assert.strictEqual(formatDuration("10", "ms"), "0.010");
    assert.strictEqual(formatDuration("100", "ms"), "0.100");
    assert.strictEqual(formatDuration("1000", "ms"), "1");
    assert.strictEqual(formatDuration("1001", "ms"), "1.001");
    assert.strictEqual(formatDuration("65000", "ms"), "1:05");
    assert.strictEqual(formatDuration("3665000", "ms"), "1:01:05");
    assert.strictEqual(formatDuration("39665050", "ms"), "11:01:05");
    assert.strictEqual(formatDuration("932093000", "ms"), "258:54:53");

    assert.strictEqual(formatDuration("0", "s"), "0");
    assert.strictEqual(formatDuration("1", "s"), "1");
    assert.strictEqual(formatDuration("1.1", "s"), "1.100");
    assert.strictEqual(formatDuration("65", "s"), "1:05");
    assert.strictEqual(formatDuration("3665", "s"), "1:01:05");
    assert.strictEqual(formatDuration("39665", "s"), "11:01:05");
    assert.strictEqual(formatDuration("932093", "s"), "258:54:53");

    assert.strictEqual(formatDuration("0", "min"), "0");
    assert.strictEqual(formatDuration("65", "min"), "1:05:00");
    assert.strictEqual(formatDuration("3665", "min"), "61:05:00");
    assert.strictEqual(formatDuration("39665", "min"), "661:05:00");
    assert.strictEqual(formatDuration("932093", "min"), "15534:53:00");
    assert.strictEqual(formatDuration("12.4", "min"), "12:24");

    assert.strictEqual(formatDuration("0", "h"), "0");
    assert.strictEqual(formatDuration("65", "h"), "65:00:00");
    assert.strictEqual(formatDuration("3665", "h"), "3665:00:00");
    assert.strictEqual(formatDuration("39665", "h"), "39665:00:00");
    assert.strictEqual(formatDuration("932093", "h"), "932093:00:00");
    assert.strictEqual(formatDuration("24.3", "h"), "24:18:00");
    assert.strictEqual(formatDuration("24.32423", "h"), "24:19:27");

    assert.strictEqual(formatDuration("0", "d"), "0");
    assert.strictEqual(formatDuration("65", "d"), "1560:00:00");
    assert.strictEqual(formatDuration("3665", "d"), "87960:00:00");
    assert.strictEqual(formatDuration("39665", "d"), "951960:00:00");
    assert.strictEqual(formatDuration("932093", "d"), "22370232:00:00");
  });
});
