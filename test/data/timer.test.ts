import { assert, describe, expect, it } from "vitest";

import { createDurationData } from "../../src/common/datetime/create_duration_data";
import {
  computeDisplayTimer,
  durationDataToTimerString,
  normalizeTimerDuration,
  normalizeTimerPresets,
  timerDurationData,
  timerJustFinished,
} from "../../src/data/timer";

const timerState = (state: string, lastTransition?: string) =>
  ({
    state,
    attributes: { last_transition: lastTransition },
  }) as any;

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

describe("durationDataToTimerString", () => {
  it("serializes with zero-padded minutes and seconds", () => {
    assert.strictEqual(
      durationDataToTimerString({ hours: 1, minutes: 5, seconds: 7 }),
      "1:05:07"
    );
  });

  it("treats missing fields as zero", () => {
    assert.strictEqual(durationDataToTimerString({ minutes: 30 }), "0:30:00");
    assert.strictEqual(durationDataToTimerString({}), "0:00:00");
  });

  it("folds days into hours", () => {
    assert.strictEqual(
      durationDataToTimerString({ days: 1, hours: 2 }),
      "26:00:00"
    );
  });

  it("round-trips through createDurationData", () => {
    const data = createDurationData("2:15:30")!;
    assert.strictEqual(durationDataToTimerString(data), "2:15:30");
  });

  it("normalizes out-of-range fields", () => {
    assert.strictEqual(durationDataToTimerString({ seconds: 3600 }), "1:00:00");
    assert.strictEqual(durationDataToTimerString({ minutes: 90 }), "1:30:00");
  });

  it("floors fractional seconds instead of serializing decimals", () => {
    assert.strictEqual(durationDataToTimerString({ seconds: 1.5 }), "0:00:01");
    assert.strictEqual(
      durationDataToTimerString({ seconds: 1, milliseconds: 500 }),
      "0:00:01"
    );
  });
});

describe("normalizeTimerDuration", () => {
  it("decomposes overflowing fields into hours/minutes/seconds", () => {
    assert.deepEqual(normalizeTimerDuration({ seconds: 3600 }), {
      hours: 1,
      minutes: 0,
      seconds: 0,
    });
    assert.deepEqual(normalizeTimerDuration({ days: 1, hours: 2 }), {
      hours: 26,
      minutes: 0,
      seconds: 0,
    });
  });

  it("drops fractional seconds", () => {
    assert.deepEqual(normalizeTimerDuration({ seconds: 90.9 }), {
      hours: 0,
      minutes: 1,
      seconds: 30,
    });
  });
});

describe("timerJustFinished", () => {
  it("detects a timer running out or being finished", () => {
    expect(
      timerJustFinished(timerState("active"), timerState("idle", "finished"))
    ).toBe(true);
    expect(
      timerJustFinished(timerState("paused"), timerState("idle", "finished"))
    ).toBe(true);
  });

  it("does not match a cancelled timer", () => {
    expect(
      timerJustFinished(timerState("active"), timerState("idle", "cancelled"))
    ).toBe(false);
  });

  it("does not match without a state transition", () => {
    expect(
      timerJustFinished(
        timerState("idle", "finished"),
        timerState("idle", "finished")
      )
    ).toBe(false);
    expect(timerJustFinished(undefined, timerState("idle", "finished"))).toBe(
      false
    );
  });

  it("does not match on older cores without last_transition", () => {
    expect(timerJustFinished(timerState("active"), timerState("idle"))).toBe(
      false
    );
  });
});

describe("computeDisplayTimer", () => {
  const formatEntityState = (stateObj: any) =>
    stateObj.state === "idle"
      ? "Idle"
      : stateObj.state === "paused"
        ? "Paused"
        : "Active";

  it("shows the formatted state when idle", () => {
    assert.strictEqual(
      computeDisplayTimer(
        formatEntityState,
        { state: "idle", attributes: {} } as any,
        undefined
      ),
      "Idle"
    );
  });

  it("shows the formatted state when the remaining time is zero", () => {
    assert.strictEqual(
      computeDisplayTimer(
        formatEntityState,
        { state: "active", attributes: {} } as any,
        0
      ),
      "Active"
    );
  });

  it("shows the remaining time when active", () => {
    assert.strictEqual(
      computeDisplayTimer(
        formatEntityState,
        { state: "active", attributes: {} } as any,
        90
      ),
      "1:30"
    );
  });

  it("appends the formatted state when paused", () => {
    assert.strictEqual(
      computeDisplayTimer(
        formatEntityState,
        { state: "paused", attributes: {} } as any,
        90
      ),
      "1:30 (Paused)"
    );
  });
});

describe("normalizeTimerPresets", () => {
  it("returns an empty list when nothing is stored", () => {
    assert.deepEqual(normalizeTimerPresets(undefined), []);
    assert.deepEqual(normalizeTimerPresets([]), []);
  });

  it("keeps the stored order and drops duplicates", () => {
    assert.deepEqual(normalizeTimerPresets([600, 60, 300, 60]), [600, 60, 300]);
  });

  it("truncates fractional seconds", () => {
    // Timers only accept whole seconds, and 90.4 and 90.9 are the same preset.
    assert.deepEqual(normalizeTimerPresets([90.4, 90.9]), [90]);
  });

  it("drops values that cannot start a timer", () => {
    assert.deepEqual(
      normalizeTimerPresets([0, -60, NaN, Infinity, 300] as number[]),
      [300]
    );
  });
});
