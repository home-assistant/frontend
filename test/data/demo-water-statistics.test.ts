import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRecorder } from "../../demo/src/stubs/recorder";
import type { Statistics } from "../../src/data/recorder";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";

const fetchWater = (
  period: "5minute" | "hour" | "day" | "month",
  ids = ["sensor.energy_water", "sensor.energy_water_cost"],
  start = "2026-01-01T00:00:00Z",
  end = "2026-02-01T00:00:00Z"
): Statistics => {
  const mockWS = vi.fn();
  const hass = { mockWS, states: {} } as unknown as MockHomeAssistant;
  mockRecorder(hass);
  const handler = mockWS.mock.calls.find(
    ([type]) => type === "recorder/statistics_during_period"
  )![1];
  return handler(
    {
      statistic_ids: ids,
      start_time: start,
      end_time: end,
      period,
    },
    hass
  );
};

describe("demo water statistics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    ["5minute", 20 / 24],
    ["hour", 10],
    ["day", 240],
    ["month", 7440],
  ] as const)("scales consumption for %s buckets", (period, expected) => {
    expect(fetchWater(period)["sensor.energy_water"][0].change).toBeCloseTo(
      expected
    );
  });

  it.each([
    ["2026-02-01", "2026-03-01", 6720],
    ["2024-02-01", "2024-03-01", 6960],
    ["2026-04-01", "2026-05-01", 7200],
  ])("uses the actual month duration from %s", (start, end, expected) => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const stats = fetchWater(
      "month",
      undefined,
      `${start}T00:00:00Z`,
      `${end}T00:00:00Z`
    );
    expect(stats["sensor.energy_water"][0].change).toBeCloseTo(expected);
  });

  it("scales each month independently in a multi-month request", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const stats = fetchWater(
      "month",
      undefined,
      "2026-01-01T00:00:00Z",
      "2026-04-01T00:00:00Z"
    );
    expect(stats["sensor.energy_water"].map((bucket) => bucket.change)).toEqual(
      [7440, 6720, 7440]
    );
  });

  it.each([
    ["sensor.energy_water", "sensor.energy_water_cost"],
    ["sensor.energy_water_cost", "sensor.energy_water"],
    ["sensor.energy_water_cost"],
  ])("derives costs regardless of requested IDs: %j", (...ids) => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25).mockReturnValue(0.5);
    const stats = fetchWater("hour", ids);
    const costs = stats["sensor.energy_water_cost"];
    expect(costs[0].change).toBeCloseTo(5 * 0.004);
    let total = 0;
    costs.forEach((cost, index) => {
      const consumption = stats["sensor.energy_water"]?.[index];
      if (consumption) {
        expect(cost.change).toBeCloseTo(consumption.change! * 0.004);
      }
      total += cost.change!;
      expect(cost.sum).toBeCloseTo(total);
      expect(cost.state).toBeCloseTo(total);
    });
  });
});
