import { assert, describe, it } from "vitest";

import durationToSeconds, {
  durationDataToSeconds,
} from "../../../src/common/datetime/duration_to_seconds";

describe("durationToSeconds", () => {
  it("works", () => {
    assert.strictEqual(durationToSeconds("0:01:05"), 65);
    assert.strictEqual(durationToSeconds("11:01:05"), 39665);
  });
});

describe("durationDataToSeconds", () => {
  it("sums all duration fields", () => {
    assert.strictEqual(
      durationDataToSeconds({
        days: 1,
        hours: 2,
        minutes: 3,
        seconds: 4,
        milliseconds: 500,
      }),
      93784.5
    );
  });

  it("treats missing fields as zero", () => {
    assert.strictEqual(durationDataToSeconds({}), 0);
    assert.strictEqual(durationDataToSeconds({ hours: 6 }), 21600);
  });
});
