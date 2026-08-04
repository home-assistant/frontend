import { bench, describe } from "vitest";
import type { EnergyData } from "../../src/data/energy";
import { generatePowerSourcesGraphData } from "../../src/panels/lovelace/cards/energy/power-sources-graph-data";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { mockLocalize } from "../fixtures/hass";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../fixtures/energy";
import { generateStatistics } from "../fixtures/statistics";
import { FIXED_EPOCH_MS } from "../fixtures/history-states";

const dayMs = 24 * 60 * 60 * 1000;

const computedStyles = createMockComputedStyle({
  "--energy-solar-color": "#ff9800",
  "--energy-grid-consumption-color": "#488fc2",
  "--energy-battery-out-color": "#4db6ac",
  "--primary-text-color": "#212121",
});

const RATE_IDS = {
  grid: "sensor.grid_power",
  solar: "sensor.solar_power",
  battery: "sensor.battery_power",
};

const buildEnergyData = (
  seed: number,
  days: number,
  period: "5minute" | "hour" | "day"
): EnergyData => {
  const prefs = generateEnergyPreferences({
    grid: true,
    solar: true,
    battery: true,
    gas: false,
    water: false,
  });
  const ids: string[] = [];
  for (const source of prefs.energy_sources) {
    if (source.type === "grid") {
      source.stat_rate = RATE_IDS.grid;
      ids.push(RATE_IDS.grid);
    } else if (source.type === "solar") {
      source.stat_rate = RATE_IDS.solar;
      ids.push(RATE_IDS.solar);
    } else if (source.type === "battery") {
      source.stat_rate = RATE_IDS.battery;
      ids.push(RATE_IDS.battery);
    }
  }
  const base = generateEnergyData(seed, { days, period, prefs });
  const meanStats = generateStatistics(seed + 100, {
    ids,
    period,
    days,
    sumStatistics: false,
  });
  return { ...base, stats: meanStats };
};

// Many-series scenario: the card collapses sources into at most three keys
// (solar/grid/battery), but each key can carry many stat_rate ids that
// processData merges per timestamp. The default fixtures only ever wire up one
// stat_rate per type, so the per-timestamp bucket summation (and the per-point
// usage-sum loop) never sees the series dimension. This builder spreads
// `seriesPerType` distinct stat_rate ids across each of the three types
// (~3 x seriesPerType total) so the many-series merge path is exercised.
const buildManySeriesEnergyData = (
  seed: number,
  days: number,
  period: "5minute" | "hour" | "day",
  seriesPerType: number
): EnergyData => {
  const prefs = generateEnergyPreferences({
    grid: true,
    solar: true,
    battery: true,
    gas: false,
    water: false,
  });
  const sources: EnergyData["prefs"]["energy_sources"] = [];
  const ids: string[] = [];
  for (const source of prefs.energy_sources) {
    const type =
      source.type === "grid"
        ? "grid"
        : source.type === "solar"
          ? "solar"
          : "battery";
    for (let i = 0; i < seriesPerType; i++) {
      const id = `sensor.${type}_power_${i}`;
      ids.push(id);
      sources.push({ ...source, stat_rate: id });
    }
  }
  prefs.energy_sources = sources;
  const base = generateEnergyData(seed, { days, period, prefs });
  const meanStats = generateStatistics(seed + 100, {
    ids,
    period,
    days,
    sumStatistics: false,
  });
  return { ...base, stats: meanStats };
};

const small = buildEnergyData(1, 1, "hour");
const medium = buildEnergyData(2, 31, "hour");
const large = buildEnergyData(3, 14, "5minute");
// ~18 stat sets (6 per type) at month-hourly resolution.
const manySeries = buildManySeriesEnergyData(4, 31, "hour", 6);

const base = {
  localize: mockLocalize,
  states: {},
  computedStyles,
  start: new Date(FIXED_EPOCH_MS),
  end: new Date(FIXED_EPOCH_MS + 30 * dayMs),
  now: FIXED_EPOCH_MS + 60 * dayMs,
} as const;

describe("generatePowerSourcesGraphData", () => {
  bench("small (1 day hourly)", () => {
    // generatePowerSourcesGraphData pushes a synthetic point into the stats
    // arrays when showing "today"; clone so iterations stay independent.
    generatePowerSourcesGraphData({
      ...base,
      energyData: { ...small, stats: structuredClone(small.stats) },
    });
  });

  bench("medium (1 month hourly)", () => {
    generatePowerSourcesGraphData({
      ...base,
      energyData: { ...medium, stats: structuredClone(medium.stats) },
    });
  });

  bench(
    "large (2 weeks 5-minute)",
    () => {
      generatePowerSourcesGraphData({
        ...base,
        energyData: { ...large, stats: structuredClone(large.stats) },
      });
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench("many series (~18 series, 1 month hourly)", () => {
    generatePowerSourcesGraphData({
      ...base,
      energyData: { ...manySeries, stats: structuredClone(manySeries.stats) },
    });
  });
});
