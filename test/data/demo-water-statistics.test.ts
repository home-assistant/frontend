import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRecorder } from "../../demo/src/stubs/recorder";
import type { Statistics } from "../../src/data/recorder";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";

const fetchWater = (
  period: "5minute" | "hour" | "day" | "month",
  ids = ["sensor.energy_water", "sensor.energy_water_cost"]
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
      start_time: "2026-01-01T00:00:00Z",
      end_time: "2026-02-01T00:00:00Z",
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
    ["month", 7200],
  ] as const)("scales consumption for %s buckets", (period, expected) => {
    expect(fetchWater(period)["sensor.energy_water"][0].change).toBeCloseTo(
      expected
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
