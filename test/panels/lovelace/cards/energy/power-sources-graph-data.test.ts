/**
 * Characterization tests pinning the exact output of the power sources graph
 * card data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import type { HassEntities } from "home-assistant-js-websocket";
import type { EnergyData } from "../../../../../src/data/energy";
import { generatePowerSourcesGraphData } from "../../../../../src/panels/lovelace/cards/energy/power-sources-graph-data";
import { createMockComputedStyle } from "../../../../fixtures/computed-style";
import { digestResult } from "../../../../fixtures/digest";
import { createMockEntityState, mockLocalize } from "../../../../fixtures/hass";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../../../../fixtures/energy";
import { generateStatistics } from "../../../../fixtures/statistics";
import { FIXED_EPOCH_MS } from "../../../../fixtures/history-states";

const dayMs = 24 * 60 * 60 * 1000;

// The power graph reads `source.stat_rate` and looks the id up in
// `energyData.stats` expecting `mean`-style values (power rate, kW). The
// energy fixtures default to sum-style statistics, so we attach `stat_rate`
// ids and overwrite their stats with mean-style data.
const RATE_IDS = {
  grid: "sensor.grid_power",
  solar: "sensor.solar_power",
  battery: "sensor.battery_power",
};

// The card resolves these theme colors via getComputedStyle.
const computedStyles = createMockComputedStyle({
  "--energy-solar-color": "#ff9800",
  "--energy-grid-consumption-color": "#488fc2",
  "--energy-battery-out-color": "#4db6ac",
  "--primary-text-color": "#212121",
});

interface BuildOptions {
  days: number;
  period?: "5minute" | "hour" | "day";
  compare?: boolean;
  grid?: boolean;
  solar?: boolean;
  battery?: boolean;
}

const buildEnergyData = (seed: number, o: BuildOptions): EnergyData => {
  const prefs = generateEnergyPreferences({
    grid: o.grid,
    solar: o.solar,
    battery: o.battery,
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
  const base = generateEnergyData(seed, {
    days: o.days,
    period: o.period,
    compare: o.compare,
    prefs,
  });
  // mean-style stats (power rate). Allow some values to dip negative for the
  // battery/grid export path by subtracting a baseline.
  const meanStats = generateStatistics(seed + 100, {
    ids,
    period: o.period ?? "hour",
    days: o.days,
    sumStatistics: false,
  });
  return { ...base, stats: meanStats };
};

describe("generatePowerSourcesGraphData", () => {
  const baseParams = {
    localize: mockLocalize,
    states: {} as HassEntities,
    computedStyles,
    start: new Date(FIXED_EPOCH_MS),
    end: new Date(FIXED_EPOCH_MS + dayMs),
    now: FIXED_EPOCH_MS + dayMs + 60 * 60 * 1000,
  } as const;

  it("matches snapshot for grid + solar + battery (hour)", () => {
    const energyData = buildEnergyData(1, {
      days: 1,
      period: "hour",
      grid: true,
      solar: true,
      battery: true,
    });
    expect(
      generatePowerSourcesGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot for grid-only (hour)", () => {
    const energyData = buildEnergyData(2, {
      days: 1,
      period: "hour",
      grid: true,
      solar: false,
      battery: false,
    });
    expect(
      generatePowerSourcesGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot for solar + battery, no grid (hour)", () => {
    const energyData = buildEnergyData(3, {
      days: 1,
      period: "hour",
      grid: false,
      solar: true,
      battery: true,
    });
    expect(
      generatePowerSourcesGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot with compare period", () => {
    const energyData = buildEnergyData(4, {
      days: 1,
      period: "hour",
      compare: true,
      grid: true,
      solar: true,
      battery: true,
    });
    expect(
      generatePowerSourcesGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("appends current state when showing today", () => {
    // prev start/end and now all land on the same UTC day as FIXED_EPOCH_MS
    const now = FIXED_EPOCH_MS + 12 * 60 * 60 * 1000;
    const energyData = buildEnergyData(5, {
      days: 1,
      period: "hour",
      grid: true,
      solar: true,
      battery: true,
    });
    const states: HassEntities = {
      [RATE_IDS.grid]: createMockEntityState(RATE_IDS.grid, "1500", {
        unit_of_measurement: "W",
      }),
      [RATE_IDS.solar]: createMockEntityState(RATE_IDS.solar, "-800", {
        unit_of_measurement: "W",
      }),
      [RATE_IDS.battery]: createMockEntityState(RATE_IDS.battery, "200", {
        unit_of_measurement: "W",
      }),
    };
    expect(
      generatePowerSourcesGraphData({
        ...baseParams,
        states,
        energyData,
        start: new Date(now),
        end: new Date(now + 1000),
        now,
      })
    ).toMatchSnapshot();
  });

  it("does not append current state when not showing today", () => {
    // prev start/end are 10 days before now -> isSameDay is false
    const now = FIXED_EPOCH_MS + dayMs;
    const energyData = buildEnergyData(6, {
      days: 1,
      period: "hour",
      grid: true,
      solar: true,
      battery: true,
    });
    const states: HassEntities = {
      [RATE_IDS.grid]: createMockEntityState(RATE_IDS.grid, "9999", {
        unit_of_measurement: "W",
      }),
    };
    expect(
      generatePowerSourcesGraphData({
        ...baseParams,
        states,
        energyData,
        start: new Date(now - 10 * dayMs),
        end: new Date(now - 9 * dayMs),
        now,
      })
    ).toMatchSnapshot();
  });

  it("large multi-day 5-minute payload digest is stable", () => {
    const energyData = buildEnergyData(42, {
      days: 14,
      period: "5minute",
      compare: true,
      grid: true,
      solar: true,
      battery: true,
    });
    expect(
      digestResult(
        generatePowerSourcesGraphData({
          ...baseParams,
          energyData,
          end: new Date(FIXED_EPOCH_MS + 14 * dayMs),
        })
      )
    ).toMatchSnapshot();
  });
});
