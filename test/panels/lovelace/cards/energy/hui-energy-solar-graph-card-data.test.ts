/**
 * Characterization tests pinning the exact output of the solar energy graph
 * card data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import { generateEnergySolarGraphData } from "../../../../../src/panels/lovelace/cards/energy/energy-solar-graph-data";
import type {
  EnergyPreferences,
  EnergySolarForecasts,
  SolarSourceTypeEnergyPreference,
} from "../../../../../src/data/energy";
import type { HomeAssistant } from "../../../../../src/types";
import { createMockComputedStyle } from "../../../../fixtures/computed-style";
import { digestResult } from "../../../../fixtures/digest";
import { createMockHass } from "../../../../fixtures/hass";
import { generateEnergyData } from "../../../../fixtures/energy";
import { FIXED_EPOCH_MS } from "../../../../fixtures/history-states";

const dayMs = 24 * 60 * 60 * 1000;

const computedStyles = createMockComputedStyle({
  "--energy-solar-color": "#ff9800",
  "--primary-text-color": "#212121",
});

const hass = {
  ...createMockHass(),
  themes: { darkMode: false },
} as unknown as HomeAssistant;

const now = new Date(FIXED_EPOCH_MS + dayMs);

/** Prefs with one or two solar sources, optionally with forecast entries. */
const solarPrefs = (opts: {
  sources?: number;
  forecast?: boolean;
}): EnergyPreferences => {
  const { sources = 1, forecast = false } = opts;
  const energySources: SolarSourceTypeEnergyPreference[] = [];
  for (let i = 0; i < sources; i++) {
    energySources.push({
      type: "solar",
      stat_energy_from:
        i === 0 ? "sensor.solar_production" : `sensor.solar_production_${i}`,
      config_entry_solar_forecast: forecast ? [`entry_${i}`] : null,
      ...(i > 0 ? { name: `Roof ${i}` } : {}),
    } as SolarSourceTypeEnergyPreference);
  }
  return {
    energy_sources: energySources,
    device_consumption: [],
    device_consumption_water: [],
  };
};

/** Deterministic forecast payload aligned to the data window. */
const buildForecasts = (
  count: number,
  stepMs: number,
  entries: string[]
): EnergySolarForecasts => {
  const result: EnergySolarForecasts = {};
  entries.forEach((entry, e) => {
    const wh: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      const t = new Date(FIXED_EPOCH_MS + i * stepMs);
      wh[t.toISOString()] = ((i * 137 + e * 311 + 17) % 5000) + 1;
    }
    result[entry] = { wh_hours: wh };
  });
  return result;
};

describe("generateEnergySolarGraphData", () => {
  it("returns a placeholder dataset and zero total for no solar sources", () => {
    const energyData = generateEnergyData(1, {
      days: 1,
      period: "hour",
      prefs: {
        energy_sources: [],
        device_consumption: [],
        device_consumption_water: [],
      },
    });
    const result = generateEnergySolarGraphData({
      hass,
      energyData,
      forecasts: undefined,
      computedStyles,
      now,
    });
    expect(result.total).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("matches snapshot for a single solar source, hourly, no compare", () => {
    const energyData = generateEnergyData(2, {
      days: 2,
      period: "hour",
      prefs: solarPrefs({ sources: 1 }),
    });
    expect(
      generateEnergySolarGraphData({
        hass,
        energyData,
        forecasts: undefined,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot for two solar sources with compare", () => {
    const energyData = generateEnergyData(3, {
      days: 2,
      period: "hour",
      compare: true,
      prefs: solarPrefs({ sources: 2 }),
    });
    const result = generateEnergySolarGraphData({
      hass,
      energyData,
      forecasts: undefined,
      computedStyles,
      now,
    });
    // compare statistics produce `compare-` prefixed datasets
    expect(
      result.chartData.some((d) => String(d.id).startsWith("compare-"))
    ).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("matches snapshot for the daily period", () => {
    const energyData = generateEnergyData(4, {
      days: 40,
      period: "day",
      prefs: solarPrefs({ sources: 1 }),
    });
    expect(
      generateEnergySolarGraphData({
        hass,
        energyData,
        forecasts: undefined,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot with hourly forecast data (sub-daily centering)", () => {
    const energyData = generateEnergyData(5, {
      days: 2,
      period: "hour",
      prefs: solarPrefs({ sources: 1, forecast: true }),
    });
    const forecasts = buildForecasts(2 * 24, 60 * 60 * 1000, ["entry_0"]);
    const result = generateEnergySolarGraphData({
      hass,
      energyData,
      forecasts,
      computedStyles,
      now,
    });
    expect(
      result.chartData.some((d) => String(d.id).startsWith("forecast-"))
    ).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("matches snapshot with daily-period forecast data (no centering)", () => {
    const energyData = generateEnergyData(6, {
      days: 40,
      period: "day",
      prefs: solarPrefs({ sources: 2, forecast: true }),
    });
    const forecasts = buildForecasts(40 * 24, 60 * 60 * 1000, [
      "entry_0",
      "entry_1",
    ]);
    expect(
      generateEnergySolarGraphData({
        hass,
        energyData,
        forecasts,
        computedStyles,
        now: new Date(FIXED_EPOCH_MS + 40 * dayMs),
      })
    ).toMatchSnapshot();
  });

  it("large 5-minute payload digest is stable", () => {
    const energyData = generateEnergyData(42, {
      days: 31,
      period: "5minute",
      compare: true,
      prefs: solarPrefs({ sources: 2 }),
    });
    expect(
      digestResult(
        generateEnergySolarGraphData({
          hass,
          energyData,
          forecasts: undefined,
          computedStyles,
          now: new Date(FIXED_EPOCH_MS + 31 * dayMs),
        })
      )
    ).toMatchSnapshot();
  });
});
