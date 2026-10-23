import { describe, expect, it } from "vitest";

import { LogStreamMerger } from "../../src/data/log_backlog";

describe("LogStreamMerger", () => {
  it("merges the records of several streams in time order", () => {
    expect(
      new LogStreamMerger(2, 100).merge([
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
      new LogStreamMerger(2, 100).merge([
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
      new LogStreamMerger(2, 100).merge([
        ["continued from an earlier record", "2026-10-21 10:00:01.000 [a] A"],
        ["2026-10-21 10:00:01.000 [b] B"],
      ])
    ).toEqual([
      "continued from an earlier record",
      "2026-10-21 10:00:01.000 [a] A",
      "2026-10-21 10:00:01.000 [b] B",
    ]);
  });

  it("orders the batches of a flush sent to separate streams", () => {
    expect(
      new LogStreamMerger(2, 100).merge([
        ["2026-10-21 10:00:01.000 [a] A1", "2026-10-21 10:00:03.000 [a] A3"],
        ["2026-10-21 10:00:02.000 [b] B2"],
      ])
    ).toEqual([
      "2026-10-21 10:00:01.000 [a] A1",
      "2026-10-21 10:00:02.000 [b] B2",
      "2026-10-21 10:00:03.000 [a] A3",
    ]);
  });

  it("keeps a record of a shared logger once", () => {
    const shared = "2026-10-21 10:00:01.000 [pymodbus] Timeout";

    expect(new LogStreamMerger(2, 100).merge([[shared], [shared]])).toEqual([
      shared,
    ]);
  });

  it("drops the copy of a shared record that arrives in a later batch", () => {
    const merger = new LogStreamMerger(2, 100);
    const shared = "2026-10-21 10:00:01.000 [pymodbus] Timeout";

    expect(merger.merge([[shared], []])).toEqual([shared]);
    expect(merger.merge([[], [shared]])).toEqual([]);
  });

  it("keeps records a single stream repeats", () => {
    const merger = new LogStreamMerger(2, 100);
    const shared = "2026-10-21 10:00:01.000 [pymodbus] Timeout";

    expect(
      merger.merge([
        [shared, shared],
        [shared, shared],
      ])
    ).toEqual([shared, shared]);
    expect(merger.merge([[shared], []])).toEqual([shared]);
  });

  it("returns an empty list without lines", () => {
    expect(new LogStreamMerger(2, 100).merge([[], []])).toEqual([]);
  });
});
