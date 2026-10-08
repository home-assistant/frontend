import { describe, expect, it } from "vitest";
import {
  computeHistoryUpdateDelay,
  countHistoryStates,
} from "../../src/data/history";

const MAX_DELAY = 5 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CHART_PIXELS = 1000;

describe("countHistoryStates", () => {
  it("adds up the states of every entity", () => {
    const state = { s: "1", lu: 1 };
    expect(
      countHistoryStates({
        "sensor.a": [state, state, state],
        "sensor.b": [state],
        "sensor.c": [],
      })
    ).toBe(4);
  });
});

describe("computeHistoryUpdateDelay", () => {
  it("never delays the update of a small history", () => {
    expect(
      computeHistoryUpdateDelay(99_999, 30 * DAY, CHART_PIXELS, MAX_DELAY)
    ).toBe(0);
  });

  it("waits at least one second for a large history over a short range", () => {
    expect(
      computeHistoryUpdateDelay(100_000, HOUR, CHART_PIXELS, MAX_DELAY)
    ).toBe(3600);
    expect(
      computeHistoryUpdateDelay(
        100_000,
        10 * 60 * 1000,
        CHART_PIXELS,
        MAX_DELAY
      )
    ).toBe(1000);
  });

  it("waits as long as a chart pixel covers on a longer range", () => {
    expect(
      computeHistoryUpdateDelay(500_000, DAY, CHART_PIXELS, MAX_DELAY)
    ).toBe(86_400);
    expect(
      computeHistoryUpdateDelay(500_000, DAY, 2 * CHART_PIXELS, MAX_DELAY)
    ).toBe(43_200);
  });

  it("never waits longer than the maximum delay", () => {
    expect(
      computeHistoryUpdateDelay(1_340_152, 30 * DAY, CHART_PIXELS, MAX_DELAY)
    ).toBe(MAX_DELAY);
  });
});
