/**
 * Characterization tests pinning the exact output of the power sources graph
 * card data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import type { HassEntities } from "home-assistant-js-websocket";
import type { EnergyData, EnergySource } from "../../../../../src/data/energy";
import {
  generatePowerSourcesGraphData,
  getPowerLegendValues,
} from "../../../../../src/panels/lovelace/cards/energy/power-sources-graph-data";
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
    formatPower: (w: number) => `${w} W`,
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

describe("getPowerLegendValues", () => {
  const now = FIXED_EPOCH_MS + 12 * 60 * 60 * 1000;
  const format = (w: number) => `${w} W`;
  const energyData = {
    ...buildEnergyData(5, {
      days: 1,
      period: "hour",
      grid: true,
      solar: true,
      battery: true,
    }),
    start: new Date(now),
    end: new Date(now + 1000),
  };
  const power = (id: string, value: string) =>
    createMockEntityState(id, value, { unit_of_measurement: "W" });

  it("returns current power per source and usage", () => {
    const states: HassEntities = {
      [RATE_IDS.grid]: power(RATE_IDS.grid, "1500"),
      [RATE_IDS.solar]: power(RATE_IDS.solar, "-800"),
      [RATE_IDS.battery]: power(RATE_IDS.battery, "200"),
    };
    expect(getPowerLegendValues(energyData, states, format)).toEqual({
      grid: "1500 W",
      solar: "-800 W",
      battery: "200 W",
      usage: "900 W",
    });
  });

  it("returns nothing when no power reading is available", () => {
    expect(getPowerLegendValues(energyData, {}, format)).toEqual({});
  });
});

const HOME_RATE_ID = "sensor.home_power";

const homeSource = {
  type: "home",
  stat_energy_to: "sensor.home_energy",
  stat_rate: HOME_RATE_ID,
} as EnergySource;

const solarSource = {
  type: "solar",
  stat_energy_from: "sensor.solar_energy",
  stat_rate: RATE_IDS.solar,
  config_entry_solar_forecast: null,
} as EnergySource;

interface MeanStat {
  start: number;
  end: number;
  mean: number;
}

// Power-rate stats (kW), same shape the card reads from energyData.stats.
const hourlyStats = (means: number[]): MeanStat[] =>
  means.map((mean, i) => ({
    start: FIXED_EPOCH_MS + i * 60 * 60 * 1000,
    end: FIXED_EPOCH_MS + (i + 1) * 60 * 60 * 1000,
    mean,
  }));

const buildHomeEnergyData = (
  sources: EnergySource[],
  stats: Record<string, MeanStat[]>
): EnergyData => {
  const prefs = {
    ...generateEnergyPreferences({
      grid: false,
      solar: false,
      battery: false,
      gas: false,
      water: false,
    }),
    energy_sources: sources,
  };
  const base = generateEnergyData(7, { days: 1, period: "hour", prefs });
  return {
    ...base,
    prefs,
    start: new Date(FIXED_EPOCH_MS),
    end: new Date(FIXED_EPOCH_MS + dayMs),
    stats: stats as unknown as EnergyData["stats"],
  };
};

describe("generatePowerSourcesGraphData with a home meter", () => {
  const params = {
    localize: mockLocalize,
    formatPower: (w: number) => `${w} W`,
    states: {} as HassEntities,
    computedStyles,
    start: new Date(FIXED_EPOCH_MS),
    end: new Date(FIXED_EPOCH_MS + dayMs),
    now: FIXED_EPOCH_MS + dayMs + 60 * 60 * 1000,
  } as const;

  // Returns the [x, y] points of the "usage" line.
  const usagePoints = (energyData: EnergyData): [number, number][] => {
    const result = generatePowerSourcesGraphData({ ...params, energyData });
    const usage = result.chartData.find((series) => series.id === "usage");
    expect(usage).toBeDefined();
    return usage!.data as [number, number][];
  };

  it("draws usage from the home sensor when no source has a power sensor", () => {
    const points = usagePoints(
      buildHomeEnergyData([homeSource], {
        [HOME_RATE_ID]: hourlyStats([2.5, 4]),
      })
    );

    expect(points).toEqual([
      [FIXED_EPOCH_MS + 30 * 60 * 1000, 2.5],
      [FIXED_EPOCH_MS + 90 * 60 * 1000, 4],
    ]);
  });

  it("prefers the home sensor over the sum of the sources", () => {
    // One home bucket covering the whole day, solar reading is different.
    const points = usagePoints(
      buildHomeEnergyData([homeSource, solarSource], {
        [HOME_RATE_ID]: [
          { start: FIXED_EPOCH_MS, end: FIXED_EPOCH_MS + dayMs, mean: 3 },
        ],
        [RATE_IDS.solar]: hourlyStats([1, 1, 1]),
      })
    );

    expect(points.length).toBeGreaterThan(0);
    for (const [, y] of points) {
      expect(y).toBe(3);
    }
  });

  it("clamps a negative home reading to zero", () => {
    const points = usagePoints(
      buildHomeEnergyData([homeSource], {
        [HOME_RATE_ID]: hourlyStats([-1]),
      })
    );

    expect(points).toEqual([[FIXED_EPOCH_MS + 30 * 60 * 1000, 0]]);
  });

  it("falls back to the sum of the sources when the home sensor has no data", () => {
    const solarStats = { [RATE_IDS.solar]: hourlyStats([1, 1, 1]) };

    const withHome = usagePoints(
      buildHomeEnergyData([homeSource, solarSource], solarStats)
    );
    const withoutHome = usagePoints(
      buildHomeEnergyData([solarSource], solarStats)
    );

    expect(withHome.length).toBeGreaterThan(0);
    expect(withHome).toEqual(withoutHome);
  });
});

describe("getPowerLegendValues with a home meter", () => {
  const format = (w: number) => `${w} W`;
  const power = (id: string, value: string) =>
    createMockEntityState(id, value, { unit_of_measurement: "W" });

  const energyDataFor = (sources: EnergySource[]) =>
    buildHomeEnergyData(sources, {});

  it("shows only usage when the home meter is the only power source", () => {
    const states: HassEntities = {
      [HOME_RATE_ID]: power(HOME_RATE_ID, "2000"),
    };
    expect(
      getPowerLegendValues(energyDataFor([homeSource]), states, format)
    ).toEqual({ usage: "2000 W" });
  });

  it("uses the home reading for usage, not the sum of the sources", () => {
    const states: HassEntities = {
      [HOME_RATE_ID]: power(HOME_RATE_ID, "2000"),
      [RATE_IDS.solar]: power(RATE_IDS.solar, "-800"),
    };
    expect(
      getPowerLegendValues(
        energyDataFor([homeSource, solarSource]),
        states,
        format
      )
    ).toEqual({ solar: "-800 W", usage: "2000 W" });
  });

  it("clamps a negative home reading to zero", () => {
    const states: HassEntities = {
      [HOME_RATE_ID]: power(HOME_RATE_ID, "-300"),
    };
    expect(
      getPowerLegendValues(energyDataFor([homeSource]), states, format)
    ).toEqual({ usage: "0 W" });
  });

  it("returns nothing when the home sensor has no reading", () => {
    expect(
      getPowerLegendValues(energyDataFor([homeSource]), {}, format)
    ).toEqual({});
  });
});
