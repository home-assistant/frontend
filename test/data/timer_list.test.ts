import { describe, expect, it } from "vitest";
import type { TimerListTimer } from "../../src/data/timer_list";
import {
  applyTimerListMessage,
  formatTimerListRemaining,
  sortTimerListTimers,
  timerListTimerVisible,
} from "../../src/data/timer_list";

const timer = (
  timer_id: string,
  status: TimerListTimer["status"] = "active"
): TimerListTimer => ({
  timer_id,
  name: null,
  status,
  created_duration: 60,
  total_duration: 60,
  created_at: "2026-01-01T00:00:00+00:00",
  finishes_at: null,
  paused_remaining: null,
  ended_at: null,
  remaining: 60,
});

// The subscription sends one snapshot and then single-timer changes, so the
// list shown in the UI depends on these being merged correctly.
describe("applyTimerListMessage", () => {
  const timers = [timer("a"), timer("b")];

  it("replaces the list with a snapshot", () => {
    expect(
      applyTimerListMessage(timers, { type: "timers", timers: [timer("c")] })
    ).toEqual([timer("c")]);
  });

  it("appends a created timer", () => {
    expect(
      applyTimerListMessage(timers, {
        type: "change",
        event_type: "created",
        timer: timer("c"),
      })
    ).toEqual([timer("a"), timer("b"), timer("c")]);
  });

  it("updates a changed timer in place", () => {
    expect(
      applyTimerListMessage(timers, {
        type: "change",
        event_type: "paused",
        timer: timer("a", "paused"),
      })
    ).toEqual([timer("a", "paused"), timer("b")]);
  });

  it("drops a removed timer", () => {
    expect(
      applyTimerListMessage(timers, {
        type: "change",
        event_type: "removed",
        timer: timer("a"),
      })
    ).toEqual([timer("b")]);
  });
});

// Ended timers stay in the backend list, so this decides what the UI shows.
describe("timerListTimerVisible", () => {
  const now = new Date("2026-01-01T00:10:00+00:00").getTime();
  const ended = (status: TimerListTimer["status"], ended_at: string) => ({
    ...timer("a", status),
    ended_at,
  });

  it.each([
    ["active", timer("a"), true],
    ["paused", timer("a", "paused"), true],
    [
      "finished 4 minutes ago",
      ended("finished", "2026-01-01T00:06:00+00:00"),
      true,
    ],
    [
      "finished 5 minutes ago",
      ended("finished", "2026-01-01T00:05:00+00:00"),
      false,
    ],
    [
      "cancelled just now",
      ended("cancelled", "2026-01-01T00:10:00+00:00"),
      false,
    ],
  ])("%s", (_name, item, visible) => {
    expect(timerListTimerVisible(item, now)).toBe(visible);
  });
});

describe("formatTimerListRemaining", () => {
  it.each([
    [0, "0:00"],
    [34.2, "0:35"],
    [593, "9:53"],
    [3725, "1:02:05"],
  ])("%s seconds", (seconds, text) => {
    expect(formatTimerListRemaining(seconds)).toBe(text);
  });
});

// The list order decides which timer people see first.
describe("sortTimerListTimers", () => {
  const now = new Date("2026-01-01T00:00:00+00:00").getTime();
  const running = (timer_id: string, seconds: number): TimerListTimer => ({
    ...timer(timer_id),
    finishes_at: new Date(now + seconds * 1000).toISOString(),
  });
  const paused = (timer_id: string, seconds: number): TimerListTimer => ({
    ...timer(timer_id, "paused"),
    paused_remaining: seconds,
  });

  it("puts finished first, then running and paused by time left", () => {
    const sorted = sortTimerListTimers(
      [
        paused("p-long", 600),
        running("r-long", 300),
        timer("done", "finished"),
        paused("p-short", 60),
        running("r-short", 30),
      ],
      now
    );
    expect(sorted.map((item) => item.timer_id)).toEqual([
      "done",
      "r-short",
      "r-long",
      "p-short",
      "p-long",
    ]);
  });
});
