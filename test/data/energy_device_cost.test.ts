import { assert, describe, it } from "vitest";
import type {
  EnergyData,
  EnergyInfo,
  EnergyPreferences,
} from "../../src/data/energy";
import {
  calculateDeviceCostGrowth,
  computeGridCostRatios,
  deviceCostSeries,
  hasGridCostData,
} from "../../src/data/energy_device_cost";
import type { Statistics } from "../../src/data/recorder";

const bucket = (start: number, change: number | null) => ({
  start,
  end: start + 3_600_000,
  change,
});

const prefs = (
  overrides: Partial<EnergyPreferences> = {}
): EnergyPreferences => ({
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
  ...overrides,
});

const info = (
  cost_sensors: Record<string, string> = {},
  overrides: Partial<EnergyInfo> = {}
): EnergyInfo => ({
  cost_sensors,
  solar_forecast_domains: [],
  ...overrides,
});

describe("computeGridCostRatios", () => {
  it("returns an empty map when no grid source is configured", () => {
    const ratios = computeGridCostRatios({}, info(), prefs());
    assert.equal(ratios.size, 0);
  });

  it("divides total grid cost by total grid kWh per bucket", () => {
    const stats: Statistics = {
      grid_kwh: [bucket(1, 2), bucket(2, 4)],
      grid_cost: [bucket(1, 0.4), bucket(2, 1.2)],
    };
    const p = prefs({
      energy_sources: [
        {
          type: "grid",
          stat_energy_from: "grid_kwh",
          stat_energy_to: null,
          stat_cost: "grid_cost",
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
      ],
    });
    const ratios = computeGridCostRatios(stats, info(), p);
    assert.equal(ratios.size, 2);
    assert.closeTo(ratios.get(1)!, 0.2, 1e-9);
    assert.closeTo(ratios.get(2)!, 0.3, 1e-9);
  });

  it("resolves the cost sensor via info.cost_sensors when stat_cost is missing", () => {
    const stats: Statistics = {
      grid_kwh: [bucket(1, 5)],
      sensor_cost: [bucket(1, 1.0)],
    };
    const p = prefs({
      energy_sources: [
        {
          type: "grid",
          stat_energy_from: "grid_kwh",
          stat_energy_to: null,
          stat_cost: null,
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
      ],
    });
    const ratios = computeGridCostRatios(
      stats,
      info({ grid_kwh: "sensor_cost" }),
      p
    );
    assert.closeTo(ratios.get(1)!, 0.2, 1e-9);
  });

  it("omits buckets with zero or negative grid energy", () => {
    const stats: Statistics = {
      grid_kwh: [bucket(1, 0), bucket(2, -1), bucket(3, 2)],
      grid_cost: [bucket(1, 0.1), bucket(2, 0.1), bucket(3, 0.6)],
    };
    const p = prefs({
      energy_sources: [
        {
          type: "grid",
          stat_energy_from: "grid_kwh",
          stat_energy_to: null,
          stat_cost: "grid_cost",
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
      ],
    });
    const ratios = computeGridCostRatios(stats, info(), p);
    assert.equal(ratios.size, 1);
    assert.closeTo(ratios.get(3)!, 0.3, 1e-9);
  });

  it("aggregates multiple grid sources into a single ratio per bucket", () => {
    const stats: Statistics = {
      grid_a_kwh: [bucket(1, 2)],
      grid_a_cost: [bucket(1, 0.4)],
      grid_b_kwh: [bucket(1, 2)],
      grid_b_cost: [bucket(1, 0.2)],
    };
    const p = prefs({
      energy_sources: [
        {
          type: "grid",
          stat_energy_from: "grid_a_kwh",
          stat_energy_to: null,
          stat_cost: "grid_a_cost",
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
        {
          type: "grid",
          stat_energy_from: "grid_b_kwh",
          stat_energy_to: null,
          stat_cost: "grid_b_cost",
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
      ],
    });
    const ratios = computeGridCostRatios(stats, info(), p);
    // (0.4 + 0.2) / (2 + 2) = 0.15
    assert.closeTo(ratios.get(1)!, 0.15, 1e-9);
  });
});

describe("hasGridCostData", () => {
  it("returns false when the period has no grid cost data", () => {
    const data: EnergyData = {
      start: new Date(0),
      prefs: prefs(),
      info: info(),
      stats: {},
      statsMetadata: {},
      statsCompare: {},
      waterUnit: "L",
      gasUnit: "m³",
    };
    assert.equal(hasGridCostData(data), false);
  });

  it("returns true when the compare window has cost data even if the main window is empty", () => {
    const p = prefs({
      energy_sources: [
        {
          type: "grid",
          stat_energy_from: "grid_kwh",
          stat_energy_to: null,
          stat_cost: "grid_cost",
          entity_energy_price: null,
          number_energy_price: null,
          stat_compensation: null,
          entity_energy_price_export: null,
          number_energy_price_export: null,
          cost_adjustment_day: 0,
        },
      ],
    });
    const data: EnergyData = {
      start: new Date(0),
      prefs: p,
      info: info(),
      stats: {},
      statsMetadata: {},
      statsCompare: {
        grid_kwh: [bucket(1, 2)],
        grid_cost: [bucket(1, 0.5)],
      },
      waterUnit: "L",
      gasUnit: "m³",
    };
    assert.equal(hasGridCostData(data), true);
  });
});

describe("calculateDeviceCostGrowth", () => {
  const ratios = new Map<number, number>([
    [1, 0.2],
    [2, 0.3],
  ]);

  it("returns null when the device stat is absent", () => {
    assert.equal(calculateDeviceCostGrowth({}, "device", ratios), null);
  });

  it("sums device_kWh * ratio per bucket, skipping buckets without a ratio", () => {
    const stats: Statistics = {
      device: [
        bucket(1, 1.5), // 1.5 * 0.2 = 0.3
        bucket(2, 2.0), // 2.0 * 0.3 = 0.6
        bucket(3, 5.0), // no ratio => skipped
      ],
    };
    const total = calculateDeviceCostGrowth(stats, "device", ratios);
    assert.closeTo(total!, 0.9, 1e-9);
  });

  it("ignores null changes", () => {
    const stats: Statistics = {
      device: [bucket(1, null), bucket(2, 1.0)],
    };
    const total = calculateDeviceCostGrowth(stats, "device", ratios);
    assert.closeTo(total!, 0.3, 1e-9);
  });
});

describe("deviceCostSeries", () => {
  it("returns an empty array when the device stat is absent", () => {
    const ratios = new Map<number, number>();
    assert.deepEqual(deviceCostSeries({}, "device", ratios), []);
  });

  it("applies ratio per bucket and emits 0 for buckets without a ratio", () => {
    const ratios = new Map<number, number>([[1, 0.5]]);
    const stats: Statistics = {
      device: [bucket(1, 2), bucket(2, 4), bucket(3, null)],
    };
    const series = deviceCostSeries(stats, "device", ratios);
    assert.equal(series.length, 3);
    assert.equal(series[0].change, 1);
    assert.equal(series[1].change, 0);
    assert.equal(series[2].change, null);
  });
});
