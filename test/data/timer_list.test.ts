import { describe, expect, it } from "vitest";
import type { TimerListTimer } from "../../src/data/timer_list";
import { applyTimerListMessage } from "../../src/data/timer_list";

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
