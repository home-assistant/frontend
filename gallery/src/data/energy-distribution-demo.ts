import type { EnergyInfo, EnergyPreferences } from "../../../src/data/energy";
import { computeConsumptionSingle } from "../../../src/data/energy";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticValue,
} from "../../../src/data/recorder";
import { StatisticMeanType } from "../../../src/data/recorder";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

/**
 * Hourly kWh for a clear summer day with ~10 kW PV, a home battery, and the
 * daily totals from https://github.com/home-assistant/frontend/issues/54185:
 * 82.4 kWh solar, 68.6 kWh export, 0.12 kWh import, 5.3 kWh charge,
 * 4.6 kWh discharge, 13.2 kWh home use.
 */
export const ENERGY_DISTRIBUTION_DEMO_SOLAR_KWH = [
  0, 0, 0, 0, 0, 0, 0.2, 1.5, 4.2, 7.8, 10.5, 12.2, 12.8, 12.1, 10.4, 7.2, 3.1,
  0.4, 0, 0, 0, 0, 0, 0,
] as const;

export const ENERGY_DISTRIBUTION_DEMO_SOLAR_TOTAL_KWH = 82.4;
export const ENERGY_DISTRIBUTION_DEMO_EXPORT_TOTAL_KWH = 68.6;
export const ENERGY_DISTRIBUTION_DEMO_IMPORT_TOTAL_KWH = 0.12;

const HOUR_MS = 60 * 60 * 1000;

export const ENERGY_DISTRIBUTION_DEMO_STAT = {
  fromGrid: "sensor.grid_import",
  toGrid: "sensor.grid_export",
  solar: "sensor.solar_production",
  fromBattery: "sensor.battery_discharge",
  toBattery: "sensor.battery_charge",
  batterySoc: "sensor.home_battery",
} as const;

export type EnergyDistributionDemoScenario = "aligned" | "export_lagged";

export interface EnergyDistributionDemoHourlyKwh {
  fromGrid: number[];
  toGrid: number[];
  solar: number[];
  fromBattery: number[];
  toBattery: number[];
}

export interface EnergyDistributionDemoAllocation {
  usedSolar: number;
  usedBattery: number;
  usedGrid: number;
  usedTotal: number;
  ringTotal: number;
}

export const ENERGY_DISTRIBUTION_DEMO_ENTITIES: EntityInput[] = [
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.solar,
    state: "82.4",
    attributes: {
      friendly_name: "Solar production",
      device_class: "energy",
      state_class: "total_increasing",
      unit_of_measurement: "kWh",
      last_reset: "1970-01-01T00:00:00+00:00",
    },
  },
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.fromGrid,
    state: "0.12",
    attributes: {
      friendly_name: "Grid import",
      device_class: "energy",
      state_class: "total_increasing",
      unit_of_measurement: "kWh",
      last_reset: "1970-01-01T00:00:00+00:00",
    },
  },
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.toGrid,
    state: "68.6",
    attributes: {
      friendly_name: "Grid export",
      device_class: "energy",
      state_class: "total_increasing",
      unit_of_measurement: "kWh",
      last_reset: "1970-01-01T00:00:00+00:00",
    },
  },
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.toBattery,
    state: "5.3",
    attributes: {
      friendly_name: "Battery charge",
      device_class: "energy",
      state_class: "total_increasing",
      unit_of_measurement: "kWh",
      last_reset: "1970-01-01T00:00:00+00:00",
    },
  },
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.fromBattery,
    state: "4.6",
    attributes: {
      friendly_name: "Battery discharge",
      device_class: "energy",
      state_class: "total_increasing",
      unit_of_measurement: "kWh",
      last_reset: "1970-01-01T00:00:00+00:00",
    },
  },
  {
    entity_id: ENERGY_DISTRIBUTION_DEMO_STAT.batterySoc,
    state: "75",
    attributes: {
      friendly_name: "Home battery",
      device_class: "battery",
      state_class: "measurement",
      unit_of_measurement: "%",
    },
  },
];

export const ENERGY_DISTRIBUTION_DEMO_PREFS: EnergyPreferences = {
  energy_sources: [
    {
      type: "grid",
      stat_energy_from: ENERGY_DISTRIBUTION_DEMO_STAT.fromGrid,
      stat_energy_to: ENERGY_DISTRIBUTION_DEMO_STAT.toGrid,
      stat_cost: null,
      stat_compensation: null,
      entity_energy_price: null,
      number_energy_price: null,
      entity_energy_price_export: null,
      number_energy_price_export: null,
      cost_adjustment_day: 0,
    },
    {
      type: "solar",
      stat_energy_from: ENERGY_DISTRIBUTION_DEMO_STAT.solar,
      config_entry_solar_forecast: null,
    },
    {
      type: "battery",
      stat_energy_from: ENERGY_DISTRIBUTION_DEMO_STAT.fromBattery,
      stat_energy_to: ENERGY_DISTRIBUTION_DEMO_STAT.toBattery,
      stat_soc: ENERGY_DISTRIBUTION_DEMO_STAT.batterySoc,
      capacity: 10,
    },
  ],
  device_consumption: [],
  device_consumption_water: [],
};

const ENERGY_DISTRIBUTION_DEMO_INFO: EnergyInfo = {
  cost_sensors: {},
  solar_forecast_domains: [],
};

export const getEnergyDistributionDemoHourlyKwh = (
  scenario: EnergyDistributionDemoScenario
): EnergyDistributionDemoHourlyKwh => {
  const solar = [...ENERGY_DISTRIBUTION_DEMO_SOLAR_KWH];
  const alignedExport = solar.map(
    (kwh) =>
      (kwh * ENERGY_DISTRIBUTION_DEMO_EXPORT_TOTAL_KWH) /
      ENERGY_DISTRIBUTION_DEMO_SOLAR_TOTAL_KWH
  );
  // Shift export one hour later so inverter production and the grid meter land
  // in different statistic buckets. Daily totals stay the same.
  const toGrid =
    scenario === "export_lagged"
      ? alignedExport.map(
          (_kwh, hour) => alignedExport[(hour + 23) % alignedExport.length]
        )
      : alignedExport;

  const toBattery = Array(solar.length).fill(0);
  [0.8, 1.2, 1.4, 1.2, 0.7].forEach((kwh, index) => {
    toBattery[10 + index] = kwh;
  });

  const fromBattery = Array(solar.length).fill(0);
  [1.2, 1.5, 1.2, 0.7].forEach((kwh, index) => {
    fromBattery[18 + index] = kwh;
  });

  const fromGrid = Array(solar.length).fill(0);
  fromGrid[23] = ENERGY_DISTRIBUTION_DEMO_IMPORT_TOTAL_KWH;

  return { fromGrid, toGrid, solar, fromBattery, toBattery };
};

export const getEnergyDistributionDemoAllocation = (
  scenario: EnergyDistributionDemoScenario
): EnergyDistributionDemoAllocation => {
  const hourly = getEnergyDistributionDemoHourlyKwh(scenario);
  let usedSolar = 0;
  let usedBattery = 0;
  let usedGrid = 0;
  let usedTotal = 0;

  for (let hour = 0; hour < hourly.solar.length; hour++) {
    const row = computeConsumptionSingle({
      from_grid: hourly.fromGrid[hour],
      to_grid: hourly.toGrid[hour],
      solar: hourly.solar[hour],
      to_battery: hourly.toBattery[hour],
      from_battery: hourly.fromBattery[hour],
    });
    usedSolar += row.used_solar;
    usedBattery += row.used_battery;
    usedGrid += row.used_grid;
    usedTotal += row.used_total;
  }

  return {
    usedSolar,
    usedBattery,
    usedGrid,
    usedTotal,
    ringTotal: usedSolar + usedBattery + usedGrid,
  };
};

const energyStatisticMetadata = (statisticId: string): StatisticsMetaData => ({
  statistic_id: statisticId,
  source: "recorder",
  name: null,
  statistics_unit_of_measurement: "kWh",
  unit_class: "energy",
  has_sum: true,
  mean_type: StatisticMeanType.NONE,
});

const hourlyStatisticValues = (
  startMs: number,
  changes: number[]
): StatisticValue[] => {
  let sum = 0;
  return changes.map((change, hour) => {
    sum += change;
    const start = startMs + hour * HOUR_MS;
    return {
      start,
      end: start + HOUR_MS,
      change,
      last_reset: 0,
      state: sum,
      sum,
      mean: null,
      min: null,
      max: null,
    };
  });
};

export const buildEnergyDistributionDemoStatistics = (
  scenario: EnergyDistributionDemoScenario,
  statisticIds: string[],
  startTime: string
): Statistics => {
  const hourly = getEnergyDistributionDemoHourlyKwh(scenario);
  const startMs = new Date(startTime).getTime();
  const seriesById: Record<string, number[]> = {
    [ENERGY_DISTRIBUTION_DEMO_STAT.fromGrid]: hourly.fromGrid,
    [ENERGY_DISTRIBUTION_DEMO_STAT.toGrid]: hourly.toGrid,
    [ENERGY_DISTRIBUTION_DEMO_STAT.solar]: hourly.solar,
    [ENERGY_DISTRIBUTION_DEMO_STAT.fromBattery]: hourly.fromBattery,
    [ENERGY_DISTRIBUTION_DEMO_STAT.toBattery]: hourly.toBattery,
  };

  const statistics: Statistics = {};
  for (const statisticId of statisticIds) {
    const series = seriesById[statisticId];
    statistics[statisticId] = series
      ? hourlyStatisticValues(startMs, series)
      : [];
  }
  return statistics;
};

export const mockEnergyDistributionDemo = (
  hass: MockHomeAssistant,
  scenario: EnergyDistributionDemoScenario
) => {
  hass.mockWS(
    "energy/get_prefs",
    (): EnergyPreferences => ENERGY_DISTRIBUTION_DEMO_PREFS
  );
  hass.mockWS("energy/info", (): EnergyInfo => ENERGY_DISTRIBUTION_DEMO_INFO);
  hass.mockWS(
    "recorder/get_statistics_metadata",
    ({ statistic_ids }: { statistic_ids?: string[] }): StatisticsMetaData[] =>
      (statistic_ids ?? []).map((statisticId) =>
        energyStatisticMetadata(statisticId)
      )
  );
  hass.mockWS(
    "recorder/statistics_during_period",
    ({
      statistic_ids,
      start_time,
    }: {
      statistic_ids: string[];
      start_time: string;
    }): Statistics =>
      buildEnergyDistributionDemoStatistics(scenario, statistic_ids, start_time)
  );
};
