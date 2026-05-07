import { describe, it, assert, vi } from "vitest";
import { HistoryStream } from "../../src/data/history";
import type { HomeAssistant } from "../../src/types";

const mockHass = {} as HomeAssistant;

describe("HistoryStream.processMessage", () => {
  it("should delete lc from boundary state when pruning expired history", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // Seed combinedHistory with states where lc differs from lu
    // (simulating a sensor reporting the same value multiple times)
    const oldLc = purgeBeforePythonTime - 3600; // lc is 1 hour before purge time
    const oldLu = purgeBeforePythonTime - 10; // lu is 10 seconds before purge time
    stream.combinedHistory = {
      "sensor.power": [
        { s: "500", a: {}, lc: oldLc, lu: oldLu },
        { s: "500", a: {}, lu: purgeBeforePythonTime + 100 },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "510", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    const boundaryState = result["sensor.power"][0];
    // lc should be deleted so chart uses lu instead of stale lc
    assert.equal(boundaryState.lc, undefined);
    // lu should be set to approximately purgeBeforePythonTime
    assert.closeTo(boundaryState.lu, purgeBeforePythonTime, 1);
    // value should be preserved from the expired state
    assert.equal(boundaryState.s, "500");
  });

  it("should handle boundary state without lc correctly", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // State without lc (lc equals lu, so lc is omitted)
    stream.combinedHistory = {
      "sensor.power": [
        { s: "500", a: {}, lu: purgeBeforePythonTime - 10 },
        { s: "510", a: {}, lu: purgeBeforePythonTime + 100 },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "520", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    const boundaryState = result["sensor.power"][0];
    assert.equal(boundaryState.lc, undefined);
    assert.closeTo(boundaryState.lu, purgeBeforePythonTime, 1);
    assert.equal(boundaryState.s, "500");
  });

  it("should not modify states when none are expired", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // All states are within the time window
    stream.combinedHistory = {
      "sensor.power": [
        {
          s: "500",
          a: {},
          lc: purgeBeforePythonTime + 50,
          lu: purgeBeforePythonTime + 100,
        },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "510", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    // First state should retain its original lc since it wasn't expired
    const firstState = result["sensor.power"][0];
    assert.equal(firstState.lc, purgeBeforePythonTime + 50);
    assert.equal(firstState.lu, purgeBeforePythonTime + 100);
  });
});
