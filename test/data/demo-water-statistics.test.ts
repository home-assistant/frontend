import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRecorder } from "../../demo/src/stubs/recorder";
import type { Statistics } from "../../src/data/recorder";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";

const fetchWater = (
  period: "5minute" | "hour" | "day" | "month",
  ids = ["sensor.energy_water", "sensor.energy_water_cost"],
  start = "2026-01-01T00:00:00Z",
  end = "2026-02-01T00:00:00Z",
  timeZone = "UTC"
): Statistics => {
  const mockWS = vi.fn();
  const hass = {
    mockWS,
    states: {},
    config: { time_zone: timeZone },
  } as unknown as MockHomeAssistant;
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
    ["day", "2026-03-08T08:00:00Z", "2026-03-09T07:00:00Z", 23],
    ["day", "2026-11-01T07:00:00Z", "2026-11-02T08:00:00Z", 25],
    ["month", "2026-03-01T08:00:00Z", "2026-04-01T07:00:00Z", 743],
    ["month", "2026-11-01T07:00:00Z", "2026-12-01T08:00:00Z", 721],
  ] as const)(
    "uses server DST boundaries for %s buckets starting %s",
    (period, start, end, hours) => {
      vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      const stats = fetchWater(
        period,
        [
          "sensor.energy_water",
          "sensor.energy_water_cost",
          "sensor.energy_consumption_tarif_1",
          "sensor.temperature",
        ],
        start,
        end,
        "America/Los_Angeles"
      );
      const consumption = stats["sensor.energy_water"];
      const costs = stats["sensor.energy_water_cost"];
      expect(consumption).toHaveLength(1);
      expect(consumption[0].start).toBe(Date.parse(start));
      expect(consumption[0].end).toBe(Date.parse(end));
      expect(consumption[0].change).toBeCloseTo(10 * hours);
      expect(costs[0].change).toBeCloseTo(10 * hours * 0.004);
      expect(costs[0].end).toBe(Date.parse(end));
      // Sum and mean generators must both preserve the timezone-aware start.
      for (const id of [
        "sensor.energy_consumption_tarif_1",
        "sensor.temperature",
      ]) {
        expect(stats[id]).toHaveLength(1);
        expect(stats[id][0].start).toBe(Date.parse(start));
        expect(stats[id][0].end).toBe(Date.parse(end));
      }
    }
  );

  it("keeps server midnight boundaries for a half-hour timezone offset", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const start = "2026-03-01T18:30:00Z";
    const end = "2026-03-02T18:30:00Z";
    const stats = fetchWater("day", undefined, start, end, "Asia/Kolkata");
    expect(stats["sensor.energy_water"]).toHaveLength(1);
    expect(stats["sensor.energy_water"][0]).toMatchObject({
      start: Date.parse(start),
      end: Date.parse(end),
      change: 240,
    });
  });

  it.each([
    [
      "ordinary LA day",
      "2026-10-13T07:00:00Z",
      "2026-10-14T06:59:59.999Z",
      "America/Los_Angeles",
      24,
    ],
    [
      "LA spring DST day",
      "2026-03-08T08:00:00Z",
      "2026-03-09T06:59:59.999Z",
      "America/Los_Angeles",
      23,
    ],
    [
      "LA fall DST day",
      "2025-11-02T07:00:00Z",
      "2025-11-03T07:59:59.999Z",
      "America/Los_Angeles",
      25,
    ],
    [
      "UTC browser day across LA fall DST",
      "2025-11-02T00:00:00Z",
      "2025-11-02T23:59:59.999Z",
      "America/Los_Angeles",
      24,
    ],
    [
      "Kolkata browser day against an LA server",
      "2026-10-12T18:30:00Z",
      "2026-10-13T18:29:59.999Z",
      "America/Los_Angeles",
      24,
    ],
    [
      "Kolkata server day",
      "2026-03-01T18:30:00Z",
      "2026-03-02T18:29:59.999Z",
      "Asia/Kolkata",
      24,
    ],
  ] as const)(
    "returns contiguous UTC hours for a %s",
    (_scenario, start, end, timeZone, hours) => {
      vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      const ids = [
        "sensor.energy_water",
        "sensor.energy_water_cost",
        "sensor.energy_consumption_tarif_1",
        "sensor.energy_consumption_tarif_2",
        "sensor.energy_production_tarif_2",
        "sensor.solar_production",
        "sensor.temperature",
      ];
      const stats = fetchWater("hour", ids, start, end, timeZone);
      const firstStart = Math.ceil(Date.parse(start) / 3600000) * 3600000;
      for (const id of ids) {
        const buckets = stats[id];
        expect(buckets, id).toHaveLength(hours);
        expect(buckets[0].start, id).toBe(firstStart);
        expect(buckets[buckets.length - 1].end, id).toBe(
          firstStart + hours * 3600000
        );
        expect(buckets[buckets.length - 1].end, id).toBeGreaterThanOrEqual(
          Date.parse(end)
        );
        buckets.forEach((bucket, index) => {
          expect(bucket.start % 3600000, id).toBe(0);
          expect(bucket.end - bucket.start, id).toBe(3600000);
          if (index > 0) {
            expect(bucket.start, id).toBe(buckets[index - 1].end);
          }
        });
      }
      expect(
        stats["sensor.energy_water"].reduce(
          (total, bucket) => total + bucket.change!,
          0
        )
      ).toBeCloseTo(hours * 10);
      expect(
        stats["sensor.energy_water_cost"].reduce(
          (total, bucket) => total + bucket.change!,
          0
        )
      ).toBeCloseTo(hours * 10 * 0.004);
    }
  );

  it.each([
    ["2026-01-01T18:30:00Z", 4],
    ["2026-01-01T18:32:17Z", 3],
  ] as const)("uses the five-minute UTC grid from %s", (start, count) => {
    const ids = ["sensor.energy_water", "sensor.temperature"];
    const stats = fetchWater(
      "5minute",
      ids,
      start,
      "2026-01-01T18:49:59.999Z",
      "America/Los_Angeles"
    );
    for (const id of ids) {
      const buckets = stats[id];
      expect(buckets, id).toHaveLength(count);
      expect(buckets[0].start, id).toBe(
        Date.parse(count === 4 ? start : "2026-01-01T18:35:00Z")
      );
      expect(buckets[buckets.length - 1].end, id).toBe(
        Date.parse("2026-01-01T18:50:00Z")
      );
      buckets.forEach((bucket, index) => {
        expect(bucket.start % 300000, id).toBe(0);
        expect(bucket.end - bucket.start, id).toBe(300000);
        if (index > 0) {
          expect(bucket.start, id).toBe(buckets[index - 1].end);
        }
      });
    }
  });

  it("keeps consecutive daily buckets aligned across the spring DST change", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const stats = fetchWater(
      "day",
      undefined,
      "2026-03-07T08:00:00Z",
      "2026-03-10T07:00:00Z",
      "America/Los_Angeles"
    );
    const consumption = stats["sensor.energy_water"];
    expect(consumption.map((bucket) => bucket.change)).toEqual([240, 230, 240]);
    expect(consumption.map((bucket) => bucket.end)).toEqual([
      Date.parse("2026-03-08T08:00:00Z"),
      Date.parse("2026-03-09T07:00:00Z"),
      Date.parse("2026-03-10T07:00:00Z"),
    ]);
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
