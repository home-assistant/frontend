import { assert, describe, it } from "vitest";

import { timerDurationData } from "../../src/data/timer";

describe("timerDurationData", () => {
  it("derives the input prefill from the configured duration", () => {
    assert.deepEqual(
      timerDurationData({
        state: "idle",
        attributes: {
          duration: "0:03:00",
          remaining: "0:03:00",
        },
      } as any),
      { hours: 0, minutes: 3, seconds: 0, milliseconds: 0 }
    );
  });

  it("uses the configured duration, not the remaining time, when running", () => {
    assert.deepEqual(
      timerDurationData({
        state: "active",
        attributes: {
          duration: "2:00:00",
          remaining: "1:30:00",
          finishes_at: "2018-01-17T16:16:35Z",
        },
      } as any),
      { hours: 2, minutes: 0, seconds: 0, milliseconds: 0 }
    );
  });

  it("handles durations beyond an hour", () => {
    assert.deepEqual(
      timerDurationData({
        state: "idle",
        attributes: {
          duration: "3:30:00",
          remaining: "3:30:00",
        },
      } as any),
      { hours: 3, minutes: 30, seconds: 0, milliseconds: 0 }
    );
  });
});
