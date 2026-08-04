import { bench, describe } from "vitest";
import { generateEnergySolarGraphData } from "../../src/panels/lovelace/cards/energy/energy-solar-graph-data";
import type {
  EnergyPreferences,
  EnergySolarForecasts,
  SolarSourceTypeEnergyPreference,
} from "../../src/data/energy";
import type { HomeAssistant } from "../../src/types";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { createMockHass } from "../fixtures/hass";
import { generateEnergyData } from "../fixtures/energy";
import { FIXED_EPOCH_MS } from "../fixtures/history-states";

const dayMs = 24 * 60 * 60 * 1000;

const computedStyles = createMockComputedStyle({
  "--energy-solar-color": "#ff9800",
  "--primary-text-color": "#212121",
});
const hass = {
  ...createMockHass(),
  themes: { darkMode: false },
} as unknown as HomeAssistant;

const solarPrefs = (sources: number, forecast: boolean): EnergyPreferences => {
  const energySources: SolarSourceTypeEnergyPreference[] = [];
  for (let i = 0; i < sources; i++) {
    energySources.push({
      type: "solar",
      stat_energy_from:
        i === 0 ? "sensor.solar_production" : `sensor.solar_production_${i}`,
      config_entry_solar_forecast: forecast ? [`entry_${i}`] : null,
    } as SolarSourceTypeEnergyPreference);
  }
  return {
    energy_sources: energySources,
    device_consumption: [],
    device_consumption_water: [],
  };
};

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

// small: a couple of days of hourly data, single source
const small = generateEnergyData(1, {
  days: 2,
  period: "hour",
  prefs: solarPrefs(1, false),
});

// medium: a month of hourly data with compare, two sources
const medium = generateEnergyData(2, {
  days: 31,
  period: "hour",
  compare: true,
  prefs: solarPrefs(2, false),
});

// large: a month of 5-minute data with compare, two sources
const large = generateEnergyData(3, {
  days: 31,
  period: "5minute",
  compare: true,
  prefs: solarPrefs(2, false),
});

// forecast: a month of hourly data with forecast lines, two sources
const forecastData = generateEnergyData(4, {
  days: 31,
  period: "hour",
  prefs: solarPrefs(2, true),
});
const forecasts = buildForecasts(31 * 24, 60 * 60 * 1000, [
  "entry_0",
  "entry_1",
]);

describe("generateEnergySolarGraphData", () => {
  bench("small (2 days hourly, 1 source)", () => {
    generateEnergySolarGraphData({
      hass,
      energyData: { ...small },
      forecasts: undefined,
      computedStyles,
      now: new Date(FIXED_EPOCH_MS + 2 * dayMs),
    });
  });

  bench("medium (month hourly + compare, 2 sources)", () => {
    generateEnergySolarGraphData({
      hass,
      energyData: { ...medium },
      forecasts: undefined,
      computedStyles,
      now: new Date(FIXED_EPOCH_MS + 31 * dayMs),
    });
  });

  bench(
    "large (month 5-minute + compare, 2 sources)",
    () => {
      generateEnergySolarGraphData({
        hass,
        energyData: { ...large },
        forecasts: undefined,
        computedStyles,
        now: new Date(FIXED_EPOCH_MS + 31 * dayMs),
      });
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench("with forecast (month hourly, 2 sources + forecast)", () => {
    generateEnergySolarGraphData({
      hass,
      energyData: { ...forecastData },
      forecasts,
      computedStyles,
      now: new Date(FIXED_EPOCH_MS + 31 * dayMs),
    });
  });
});
