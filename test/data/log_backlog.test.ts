import { describe, expect, it } from "vitest";

import { mergeLogBacklogs } from "../../src/data/log_backlog";

describe("mergeLogBacklogs", () => {
  it("merges the records of several backlogs in time order", () => {
    expect(
      mergeLogBacklogs([
        [
          "2026-10-21 10:00:01.000 ERROR (MainThread) [homeassistant.components.hue] Failed",
          "Traceback (most recent call last):",
          "ValueError: boom",
          "2026-10-21 10:00:03.000 INFO (MainThread) [homeassistant.components.hue] Done",
        ],
        [
          "2026-10-21 10:00:02.000 WARNING (MainThread) [homeassistant.components.mqtt] Slow",
        ],
      ])
    ).toEqual([
      "2026-10-21 10:00:01.000 ERROR (MainThread) [homeassistant.components.hue] Failed",
      "Traceback (most recent call last):",
      "ValueError: boom",
      "2026-10-21 10:00:02.000 WARNING (MainThread) [homeassistant.components.mqtt] Slow",
      "2026-10-21 10:00:03.000 INFO (MainThread) [homeassistant.components.hue] Done",
    ]);
  });

  it("sorts colored lines by their timestamp", () => {
    expect(
      mergeLogBacklogs([
        ["\x1b[32m2026-10-21 10:00:02.000 INFO (MainThread) [b] Second\x1b[0m"],
        [
          "\x1b[33m2026-10-21 10:00:01.000 WARNING (MainThread) [a] First\x1b[0m",
        ],
      ])
    ).toEqual([
      "\x1b[33m2026-10-21 10:00:01.000 WARNING (MainThread) [a] First\x1b[0m",
      "\x1b[32m2026-10-21 10:00:02.000 INFO (MainThread) [b] Second\x1b[0m",
    ]);
  });

  it("keeps lines before the first record and equal times in order", () => {
    expect(
      mergeLogBacklogs([
        ["continued from an earlier record", "2026-10-21 10:00:01.000 [a] A"],
        ["2026-10-21 10:00:01.000 [b] B"],
      ])
    ).toEqual([
      "continued from an earlier record",
      "2026-10-21 10:00:01.000 [a] A",
      "2026-10-21 10:00:01.000 [b] B",
    ]);
  });

  it("returns an empty list without lines", () => {
    expect(mergeLogBacklogs([[], []])).toEqual([]);
  });
});
