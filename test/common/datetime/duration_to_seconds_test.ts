import { assert } from "chai";

import durationToSeconds from "../../../src/common/datetime/duration_to_seconds";

describe("durationToSeconds", () => {
  it("works", () => {
    assert.strictEqual(durationToSeconds("0:01:05"), 65);
    assert.strictEqual(durationToSeconds("11:01:05"), 39665);
  });
});
