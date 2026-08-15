/**
 * Deterministic fixtures for energy dashboard data processing
 * (getSummedData / computeConsumptionData in src/data/energy.ts).
 *
 * Only the fields those functions read (`prefs.energy_sources`, `stats`,
 * `statsCompare`) are populated with meaningful data.
 */
import type {
  EnergyData,
  EnergyPreferences,
  EnergySource,
} from "../../src/data/energy";
import { FIXED_EPOCH_MS } from "./history-states";
import { generateStatistics } from "./statistics";

export interface EnergyPreferencesOptions {
  grid?: boolean;
  solar?: boolean;
  battery?: boolean;
  ev?: boolean;
  gas?: boolean;
  water?: boolean;
}

export const generateEnergyPreferences = (
  options: EnergyPreferencesOptions = {
    grid: true,
    solar: true,
    battery: true,
    gas: true,
    water: true,
  }
): EnergyPreferences => {
  const sources: EnergySource[] = [];
  if (options.grid) {
    sources.push({
      type: "grid",
      stat_energy_from: "sensor.grid_consumption",
      stat_energy_to: "sensor.grid_return",
      stat_cost: null,
      entity_energy_price: null,
      number_energy_price: null,
      stat_compensation: null,
      entity_energy_price_export: null,
      number_energy_price_export: null,
      cost_adjustment_day: 0,
    });
  }
  if (options.solar) {
    sources.push({
      type: "solar",
      stat_energy_from: "sensor.solar_production",
      config_entry_solar_forecast: null,
    });
  }
  if (options.battery) {
    sources.push({
      type: "battery",
      stat_energy_from: "sensor.battery_discharge",
      stat_energy_to: "sensor.battery_charge",
    });
  }
  if (options.ev) {
    sources.push({
      type: "ev",
      stat_energy_from: "sensor.ev_charging",
    });
  }
  if (options.gas) {
    sources.push({
      type: "gas",
      stat_energy_from: "sensor.gas_consumption",
      stat_cost: null,
      entity_energy_price: null,
      number_energy_price: null,
    });
  }
  if (options.water) {
    sources.push({
      type: "water",
      stat_energy_from: "sensor.water_consumption",
      stat_cost: null,
      entity_energy_price: null,
      number_energy_price: null,
    });
  }
  return {
    energy_sources: sources,
    device_consumption: [],
    device_consumption_water: [],
  };
};

export interface EnergyDataOptions {
  days: number;
  period?: "5minute" | "hour" | "day";
  compare?: boolean;
  prefs?: EnergyPreferences;
  /** Probability a period is missing (creates gaps); 0 for a dense dataset. */
  gapChance?: number;
}

const statisticIdsForPrefs = (prefs: EnergyPreferences): string[] => {
  const ids: string[] = [];
  for (const source of prefs.energy_sources) {
    if (source.type === "grid") {
      if (source.stat_energy_from) ids.push(source.stat_energy_from);
      if (source.stat_energy_to) ids.push(source.stat_energy_to);
    } else if (source.type === "battery") {
      ids.push(source.stat_energy_from, source.stat_energy_to);
    } else {
      ids.push(source.stat_energy_from);
    }
  }
  return ids;
};

/**
 * Builds an `EnergyData`-shaped object with the fields read by
 * getSummedData/computeConsumptionData. The result is cast from a partial:
 * unrelated fields (info, statsMetadata, units) are stubbed.
 */
export const generateEnergyData = (
  seed: number,
  options: EnergyDataOptions
): EnergyData => {
  const { days, period = "hour", compare = false, gapChance } = options;
  const prefs = options.prefs ?? generateEnergyPreferences();
  const ids = statisticIdsForPrefs(prefs);
  const dayMs = 24 * 60 * 60 * 1000;

  const stats = generateStatistics(seed, {
    ids,
    period,
    days,
    gapChance,
    sumStatistics: true,
  });
  const statsCompare = compare
    ? generateStatistics(seed + 5000, {
        ids,
        period,
        days,
        startMs: FIXED_EPOCH_MS - days * dayMs,
        gapChance,
        sumStatistics: true,
      })
    : ({} as EnergyData["statsCompare"]);

  return {
    start: new Date(FIXED_EPOCH_MS),
    end: new Date(FIXED_EPOCH_MS + days * dayMs),
    prefs,
    info: { cost_sensors: {}, solar_forecast_domains: [] },
    stats,
    statsMetadata: {},
    statsCompare,
    waterUnit: "L",
    gasUnit: "m³",
  } as EnergyData;
};
