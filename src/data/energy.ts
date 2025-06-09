import {
  addDays,
  addHours,
  addMilliseconds,
  addMonths,
  differenceInDays,
  differenceInMonths,
  endOfDay,
  startOfDay,
  isFirstDayOfMonth,
  isLastDayOfMonth,
} from "date-fns";
import type { Collection } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import {
  calcDate,
  calcDateProperty,
  calcDateDifferenceProperty,
} from "../common/datetime/calc_date";
import { formatTime24h } from "../common/datetime/format_time";
import { groupBy } from "../common/util/group-by";
import type { HomeAssistant } from "../types";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticsUnitConfiguration,
} from "./recorder";
import { fetchStatistics, getStatisticMetadata } from "./recorder";
import { calcDateRange } from "../common/datetime/calc_date_range";
import type { DateRange } from "../common/datetime/calc_date_range";
import { formatNumber } from "../common/number/format_number";
import { firstWeekdayIndex } from "../common/datetime/first_weekday";

const energyCollectionKeys: (string | undefined)[] = [];

export const emptyFlowFromGridSourceEnergyPreference =
  (): FlowFromGridSourceEnergyPreference => ({
    stat_energy_from: "",
    stat_cost: null,
    entity_energy_price: null,
    number_energy_price: null,
  });

export const emptyFlowToGridSourceEnergyPreference =
  (): FlowToGridSourceEnergyPreference => ({
    stat_energy_to: "",
    stat_compensation: null,
    entity_energy_price: null,
    number_energy_price: null,
  });

export const emptyGridSourceEnergyPreference =
  (): GridSourceTypeEnergyPreference => ({
    type: "grid",
    flow_from: [],
    flow_to: [],
    cost_adjustment_day: 0,
  });

export const emptySolarEnergyPreference =
  (): SolarSourceTypeEnergyPreference => ({
    type: "solar",
    stat_energy_from: "",
    config_entry_solar_forecast: null,
  });

export const emptyBatteryEnergyPreference =
  (): BatterySourceTypeEnergyPreference => ({
    type: "battery",
    stat_energy_from: "",
    stat_energy_to: "",
  });

export const emptyGasEnergyPreference = (): GasSourceTypeEnergyPreference => ({
  type: "gas",
  stat_energy_from: "",
  stat_cost: null,
  entity_energy_price: null,
  number_energy_price: null,
});

export const emptyWaterEnergyPreference =
  (): WaterSourceTypeEnergyPreference => ({
    type: "water",
    stat_energy_from: "",
    stat_cost: null,
    entity_energy_price: null,
    number_energy_price: null,
  });

interface EnergySolarForecast {
  wh_hours: Record<string, number>;
}
export type EnergySolarForecasts = Record<string, EnergySolarForecast>;

export interface DeviceConsumptionEnergyPreference {
  // This is an ever increasing value
  stat_consumption: string;
  name?: string;
  included_in_stat?: string;
}

export interface FlowFromGridSourceEnergyPreference {
  // kWh meter
  stat_energy_from: string;

  // $ meter
  stat_cost: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_price: string | null;
  number_energy_price: number | null;
}

export interface FlowToGridSourceEnergyPreference {
  // kWh meter
  stat_energy_to: string;

  // $ meter
  stat_compensation: string | null;

  // Can be used to generate costs if stat_compensation omitted
  entity_energy_price: string | null;
  number_energy_price: number | null;
}

export interface GridSourceTypeEnergyPreference {
  type: "grid";

  flow_from: FlowFromGridSourceEnergyPreference[];
  flow_to: FlowToGridSourceEnergyPreference[];

  cost_adjustment_day: number;
}

export interface SolarSourceTypeEnergyPreference {
  type: "solar";

  stat_energy_from: string;
  config_entry_solar_forecast: string[] | null;
}

export interface BatterySourceTypeEnergyPreference {
  type: "battery";
  stat_energy_from: string;
  stat_energy_to: string;
}
export interface GasSourceTypeEnergyPreference {
  type: "gas";

  // kWh/volume meter
  stat_energy_from: string;

  // $ meter
  stat_cost: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_price: string | null;
  number_energy_price: number | null;
  unit_of_measurement?: string | null;
}

export interface WaterSourceTypeEnergyPreference {
  type: "water";

  // volume meter
  stat_energy_from: string;

  // $ meter
  stat_cost: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_price: string | null;
  number_energy_price: number | null;
  unit_of_measurement?: string | null;
}

export type EnergySource =
  | SolarSourceTypeEnergyPreference
  | GridSourceTypeEnergyPreference
  | BatterySourceTypeEnergyPreference
  | GasSourceTypeEnergyPreference
  | WaterSourceTypeEnergyPreference;

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumptionEnergyPreference[];
}

export interface EnergyInfo {
  cost_sensors: Record<string, string>;
  solar_forecast_domains: string[];
}

export interface EnergyValidationIssue {
  type: string;
  affected_entities: [string, unknown][];
  translation_placeholders: Record<string, string>;
}

export interface EnergyPreferencesValidation {
  energy_sources: EnergyValidationIssue[][];
  device_consumption: EnergyValidationIssue[][];
}

export const getEnergyInfo = (hass: HomeAssistant) =>
  hass.callWS<EnergyInfo>({
    type: "energy/info",
  });

export const getEnergyPreferenceValidation = async (hass: HomeAssistant) => {
  await hass.loadBackendTranslation("issues", "energy");
  return hass.callWS<EnergyPreferencesValidation>({
    type: "energy/validate",
  });
};

export const getEnergyPreferences = (hass: HomeAssistant) =>
  hass.callWS<EnergyPreferences>({
    type: "energy/get_prefs",
  });

export const saveEnergyPreferences = async (
  hass: HomeAssistant,
  prefs: Partial<EnergyPreferences>
) => {
  const newPrefs = hass.callWS<EnergyPreferences>({
    type: "energy/save_prefs",
    ...prefs,
  });
  clearEnergyCollectionPreferences(hass);
  return newPrefs;
};

export type FossilEnergyConsumption = Record<string, number>;

export const getFossilEnergyConsumption = async (
  hass: HomeAssistant,
  startTime: Date,
  energy_statistic_ids: string[],
  co2_statistic_id: string,
  endTime?: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour"
) =>
  hass.callWS<FossilEnergyConsumption>({
    type: "energy/fossil_energy_consumption",
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    energy_statistic_ids,
    co2_statistic_id,
    period,
  });

interface EnergySourceByType {
  grid?: GridSourceTypeEnergyPreference[];
  solar?: SolarSourceTypeEnergyPreference[];
  battery?: BatterySourceTypeEnergyPreference[];
  gas?: GasSourceTypeEnergyPreference[];
  water?: WaterSourceTypeEnergyPreference[];
}

export const energySourcesByType = (prefs: EnergyPreferences) =>
  groupBy(prefs.energy_sources, (item) => item.type) as EnergySourceByType;

export interface EnergyData {
  start: Date;
  end?: Date;
  startCompare?: Date;
  endCompare?: Date;
  prefs: EnergyPreferences;
  info: EnergyInfo;
  stats: Statistics;
  statsMetadata: Record<string, StatisticsMetaData>;
  statsCompare: Statistics;
  co2SignalEntity?: string;
  fossilEnergyConsumption?: FossilEnergyConsumption;
  fossilEnergyConsumptionCompare?: FossilEnergyConsumption;
}

export const getReferencedStatisticIds = (
  prefs: EnergyPreferences,
  info: EnergyInfo,
  includeTypes?: string[]
): string[] => {
  const statIDs: string[] = [];

  for (const source of prefs.energy_sources) {
    if (includeTypes && !includeTypes.includes(source.type)) {
      continue;
    }

    if (source.type === "solar") {
      statIDs.push(source.stat_energy_from);
      continue;
    }

    if (source.type === "gas" || source.type === "water") {
      statIDs.push(source.stat_energy_from);

      if (source.stat_cost) {
        statIDs.push(source.stat_cost);
      }
      const costStatId = info.cost_sensors[source.stat_energy_from];
      if (costStatId) {
        statIDs.push(costStatId);
      }
      continue;
    }

    if (source.type === "battery") {
      statIDs.push(source.stat_energy_from);
      statIDs.push(source.stat_energy_to);
      continue;
    }

    // grid source
    for (const flowFrom of source.flow_from) {
      statIDs.push(flowFrom.stat_energy_from);
      if (flowFrom.stat_cost) {
        statIDs.push(flowFrom.stat_cost);
      }
      const costStatId = info.cost_sensors[flowFrom.stat_energy_from];
      if (costStatId) {
        statIDs.push(costStatId);
      }
    }
    for (const flowTo of source.flow_to) {
      statIDs.push(flowTo.stat_energy_to);
      if (flowTo.stat_compensation) {
        statIDs.push(flowTo.stat_compensation);
      }
      const costStatId = info.cost_sensors[flowTo.stat_energy_to];
      if (costStatId) {
        statIDs.push(costStatId);
      }
    }
  }
  if (!(includeTypes && !includeTypes.includes("device"))) {
    statIDs.push(...prefs.device_consumption.map((d) => d.stat_consumption));
  }

  return statIDs;
};

const getEnergyData = async (
  hass: HomeAssistant,
  prefs: EnergyPreferences,
  start: Date,
  end?: Date,
  compare?: boolean
): Promise<EnergyData> => {
  const info = await getEnergyInfo(hass);

  let co2SignalEntity: string | undefined;
  for (const entity of Object.values(hass.entities)) {
    if (entity.platform !== "co2signal") {
      continue;
    }

    // The integration offers 2 entities. We want the % one.
    const co2State = hass.states[entity.entity_id];
    if (!co2State || co2State.attributes.unit_of_measurement !== "%") {
      continue;
    }

    co2SignalEntity = co2State.entity_id;
    break;
  }

  const consumptionStatIDs: string[] = [];
  for (const source of prefs.energy_sources) {
    // grid source
    if (source.type === "grid") {
      for (const flowFrom of source.flow_from) {
        consumptionStatIDs.push(flowFrom.stat_energy_from);
      }
    }
  }
  const energyStatIds = getReferencedStatisticIds(prefs, info, [
    "grid",
    "solar",
    "battery",
    "gas",
    "device",
  ]);
  const waterStatIds = getReferencedStatisticIds(prefs, info, ["water"]);

  const allStatIDs = [...energyStatIds, ...waterStatIds];

  const dayDifference = differenceInDays(end || new Date(), start);
  const period =
    isFirstDayOfMonth(start) &&
    (!end || isLastDayOfMonth(end)) &&
    dayDifference > 35
      ? "month"
      : dayDifference > 2
        ? "day"
        : "hour";

  const lengthUnit = hass.config.unit_system.length || "";
  const energyUnits: StatisticsUnitConfiguration = {
    energy: "kWh",
    volume: lengthUnit === "km" ? "m³" : "ft³",
  };
  const waterUnits: StatisticsUnitConfiguration = {
    volume: lengthUnit === "km" ? "L" : "gal",
  };

  const _energyStats: Statistics | Promise<Statistics> = energyStatIds.length
    ? fetchStatistics(hass!, start, end, energyStatIds, period, energyUnits, [
        "change",
      ])
    : {};
  const _waterStats: Statistics | Promise<Statistics> = waterStatIds.length
    ? fetchStatistics(hass!, start, end, waterStatIds, period, waterUnits, [
        "change",
      ])
    : {};

  let statsCompare;
  let startCompare;
  let endCompare;
  let _energyStatsCompare: Statistics | Promise<Statistics> = {};
  let _waterStatsCompare: Statistics | Promise<Statistics> = {};

  if (compare) {
    if (
      (calcDateProperty(
        start,
        isFirstDayOfMonth,
        hass.locale,
        hass.config
      ) as boolean) &&
      (calcDateProperty(
        end || new Date(),
        isLastDayOfMonth,
        hass.locale,
        hass.config
      ) as boolean)
    ) {
      // When comparing a month (or multiple), we want to start at the beginning of the month
      startCompare = calcDate(
        start,
        addMonths,
        hass.locale,
        hass.config,
        -(calcDateDifferenceProperty(
          end || new Date(),
          start,
          differenceInMonths,
          hass.locale,
          hass.config
        ) as number) - 1
      );
    } else {
      startCompare = calcDate(
        start,
        addDays,
        hass.locale,
        hass.config,
        (dayDifference + 1) * -1
      );
    }
    endCompare = addMilliseconds(start, -1);
    if (energyStatIds.length) {
      _energyStatsCompare = fetchStatistics(
        hass!,
        startCompare,
        endCompare,
        energyStatIds,
        period,
        energyUnits,
        ["change"]
      );
    }
    if (waterStatIds.length) {
      _waterStatsCompare = fetchStatistics(
        hass!,
        startCompare,
        endCompare,
        waterStatIds,
        period,
        waterUnits,
        ["change"]
      );
    }
  }

  let _fossilEnergyConsumption: undefined | Promise<FossilEnergyConsumption>;
  let _fossilEnergyConsumptionCompare:
    | undefined
    | Promise<FossilEnergyConsumption>;
  if (co2SignalEntity !== undefined) {
    _fossilEnergyConsumption = getFossilEnergyConsumption(
      hass!,
      start,
      consumptionStatIDs,
      co2SignalEntity,
      end,
      dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour"
    );
    if (compare) {
      _fossilEnergyConsumptionCompare = getFossilEnergyConsumption(
        hass!,
        startCompare,
        consumptionStatIDs,
        co2SignalEntity,
        endCompare,
        dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour"
      );
    }
  }

  const statsMetadata: Record<string, StatisticsMetaData> = {};
  const _getStatisticMetadata:
    | Promise<StatisticsMetaData[]>
    | StatisticsMetaData[] = allStatIDs.length
    ? getStatisticMetadata(hass, allStatIDs)
    : [];
  const [
    energyStats,
    waterStats,
    energyStatsCompare,
    waterStatsCompare,
    statsMetadataArray,
    fossilEnergyConsumption,
    fossilEnergyConsumptionCompare,
  ] = await Promise.all([
    _energyStats,
    _waterStats,
    _energyStatsCompare,
    _waterStatsCompare,
    _getStatisticMetadata,
    _fossilEnergyConsumption,
    _fossilEnergyConsumptionCompare,
  ]);
  const stats = { ...energyStats, ...waterStats };
  if (compare) {
    statsCompare = { ...energyStatsCompare, ...waterStatsCompare };
  }
  if (allStatIDs.length) {
    statsMetadataArray.forEach((x) => {
      statsMetadata[x.statistic_id] = x;
    });
  }

  const data: EnergyData = {
    start,
    end,
    startCompare,
    endCompare,
    info,
    prefs,
    stats,
    statsMetadata,
    statsCompare,
    co2SignalEntity,
    fossilEnergyConsumption,
    fossilEnergyConsumptionCompare,
  };

  return data;
};

export interface EnergyCollection extends Collection<EnergyData> {
  start: Date;
  end?: Date;
  compare?: boolean;
  prefs?: EnergyPreferences;
  clearPrefs(): void;
  setPeriod(newStart: Date, newEnd?: Date): void;
  setCompare(compare: boolean): void;
  _refreshTimeout?: number;
  _updatePeriodTimeout?: number;
  _active: number;
}

const clearEnergyCollectionPreferences = (hass: HomeAssistant) => {
  energyCollectionKeys.forEach((key) => {
    const energyCollection = getEnergyDataCollection(hass, { key });
    energyCollection.clearPrefs();
    if (energyCollection._active) {
      energyCollection.refresh();
    }
  });
};

const scheduleHourlyRefresh = (collection: EnergyCollection) => {
  if (collection._refreshTimeout) {
    clearTimeout(collection._refreshTimeout);
  }

  if (collection._active && (!collection.end || collection.end > new Date())) {
    // The stats are created every hour
    // Schedule a refresh for 20 minutes past the hour
    // If the end is larger than the current time.
    const nextFetch = new Date();
    if (nextFetch.getMinutes() >= 20) {
      nextFetch.setHours(nextFetch.getHours() + 1);
    }
    nextFetch.setMinutes(20, 0, 0);

    collection._refreshTimeout = window.setTimeout(
      () => collection.refresh(),
      nextFetch.getTime() - Date.now()
    );
  }
};

export const getEnergyDataCollection = (
  hass: HomeAssistant,
  options: { prefs?: EnergyPreferences; key?: string } = {}
): EnergyCollection => {
  let key = "_energy";
  if (options.key) {
    if (!options.key.startsWith("energy_")) {
      throw new Error("Key need to start with energy_");
    }
    key = `_${options.key}`;
  }

  if ((hass.connection as any)[key]) {
    return (hass.connection as any)[key];
  }

  energyCollectionKeys.push(options.key);

  const collection = getCollection<EnergyData>(
    hass.connection,
    key,
    async () => {
      if (!collection.prefs) {
        // This will raise if not found.
        // Detect by checking `e.code === "not_found"
        collection.prefs = await getEnergyPreferences(hass);
      }

      scheduleHourlyRefresh(collection);

      return getEnergyData(
        hass,
        collection.prefs,
        collection.start,
        collection.end,
        collection.compare
      );
    }
  ) as EnergyCollection;

  const origSubscribe = collection.subscribe;

  collection.subscribe = (subscriber: (data: EnergyData) => void) => {
    const unsub = origSubscribe(subscriber);
    collection._active++;

    if (collection._refreshTimeout === undefined) {
      scheduleHourlyRefresh(collection);
    }

    return () => {
      collection._active--;
      if (collection._active < 1) {
        clearTimeout(collection._refreshTimeout);
        collection._refreshTimeout = undefined;
      }
      unsub();
    };
  };

  collection._active = 0;
  collection.prefs = options.prefs;

  const now = new Date();
  const hour = formatTime24h(now, hass.locale, hass.config).split(":")[0];
  // Set start to start of today if we have data for today, otherwise yesterday
  const preferredPeriod =
    (localStorage.getItem(`energy-default-period-${key}`) as DateRange) ||
    "today";
  const period =
    preferredPeriod === "today" && hour === "0" ? "yesterday" : preferredPeriod;

  const [start, end] = calcDateRange(hass, period);
  const weekStartsOn = firstWeekdayIndex(hass.locale);
  collection.start = calcDate(start, startOfDay, hass.locale, hass.config, {
    weekStartsOn,
  });
  collection.end = calcDate(end, endOfDay, hass.locale, hass.config, {
    weekStartsOn,
  });

  const scheduleUpdatePeriod = () => {
    collection._updatePeriodTimeout = window.setTimeout(
      () => {
        collection.start = calcDate(
          new Date(),
          startOfDay,
          hass.locale,
          hass.config
        );
        collection.end = calcDate(
          new Date(),
          endOfDay,
          hass.locale,
          hass.config
        );
        scheduleUpdatePeriod();
      },
      addHours(
        calcDate(new Date(), endOfDay, hass.locale, hass.config),
        1
      ).getTime() - Date.now() // Switch to next day an hour after the day changed
    );
  };
  scheduleUpdatePeriod();

  collection.clearPrefs = () => {
    collection.prefs = undefined;
  };
  collection.setPeriod = (newStart: Date, newEnd?: Date) => {
    if (collection._updatePeriodTimeout) {
      clearTimeout(collection._updatePeriodTimeout);
      collection._updatePeriodTimeout = undefined;
    }
    collection.start = newStart;
    collection.end = newEnd;
    if (
      collection.start.getTime() ===
        calcDate(new Date(), startOfDay, hass.locale, hass.config).getTime() &&
      collection.end?.getTime() ===
        calcDate(new Date(), endOfDay, hass.locale, hass.config).getTime()
    ) {
      scheduleUpdatePeriod();
    }
  };
  collection.setCompare = (compare: boolean) => {
    collection.compare = compare;
  };
  return collection;
};

export const getEnergySolarForecasts = (hass: HomeAssistant) =>
  hass.callWS<EnergySolarForecasts>({
    type: "energy/solar_forecast",
  });

const energyGasUnitClass = ["volume", "energy"] as const;
export type EnergyGasUnitClass = (typeof energyGasUnitClass)[number];

export const getEnergyGasUnitClass = (
  prefs: EnergyPreferences,
  excludeSource?: string,
  statisticsMetaData: Record<string, StatisticsMetaData> = {}
): EnergyGasUnitClass | undefined => {
  for (const source of prefs.energy_sources) {
    if (source.type !== "gas") {
      continue;
    }
    if (excludeSource && excludeSource === source.stat_energy_from) {
      continue;
    }
    const statisticIdWithMeta = statisticsMetaData[source.stat_energy_from];
    if (
      energyGasUnitClass.includes(
        statisticIdWithMeta?.unit_class as EnergyGasUnitClass
      )
    ) {
      return statisticIdWithMeta.unit_class as EnergyGasUnitClass;
    }
  }
  return undefined;
};

export const getEnergyGasUnit = (
  hass: HomeAssistant,
  prefs: EnergyPreferences,
  statisticsMetaData: Record<string, StatisticsMetaData> = {}
): string => {
  const unitClass = getEnergyGasUnitClass(prefs, undefined, statisticsMetaData);
  if (unitClass === "energy") {
    return "kWh";
  }

  return hass.config.unit_system.length === "km" ? "m³" : "ft³";
};

export const getEnergyWaterUnit = (hass: HomeAssistant): string =>
  hass.config.unit_system.length === "km" ? "L" : "gal";

export const energyStatisticHelpUrl =
  "/docs/energy/faq/#troubleshooting-missing-entities";

export interface EnergySumData {
  to_grid?: Record<number, number>;
  from_grid?: Record<number, number>;
  to_battery?: Record<number, number>;
  from_battery?: Record<number, number>;
  solar?: Record<number, number>;
  total: {
    to_grid?: number;
    from_grid?: number;
    to_battery?: number;
    from_battery?: number;
    solar?: number;
  };
  timestamps: number[];
}

export interface EnergyConsumptionData {
  used_total: Record<number, number>;
  grid_to_battery: Record<number, number>;
  battery_to_grid: Record<number, number>;
  solar_to_battery: Record<number, number>;
  solar_to_grid: Record<number, number>;
  used_solar: Record<number, number>;
  used_grid: Record<number, number>;
  used_battery: Record<number, number>;
  total: {
    used_total: number;
    grid_to_battery: number;
    battery_to_grid: number;
    solar_to_battery: number;
    solar_to_grid: number;
    used_solar: number;
    used_grid: number;
    used_battery: number;
  };
}

export const getSummedData = memoizeOne(
  (
    data: EnergyData
  ): { summedData: EnergySumData; compareSummedData?: EnergySumData } => {
    const summedData = getSummedDataPartial(data);
    const compareSummedData = data.statsCompare
      ? getSummedDataPartial(data, true)
      : undefined;
    return { summedData, compareSummedData };
  }
);

const getSummedDataPartial = (
  data: EnergyData,
  compare?: boolean
): EnergySumData => {
  const statIds: {
    to_grid?: string[];
    from_grid?: string[];
    solar?: string[];
    to_battery?: string[];
    from_battery?: string[];
  } = {};

  for (const source of data.prefs.energy_sources) {
    if (source.type === "solar") {
      if (statIds.solar) {
        statIds.solar.push(source.stat_energy_from);
      } else {
        statIds.solar = [source.stat_energy_from];
      }
      continue;
    }

    if (source.type === "battery") {
      if (statIds.to_battery) {
        statIds.to_battery.push(source.stat_energy_to);
        statIds.from_battery!.push(source.stat_energy_from);
      } else {
        statIds.to_battery = [source.stat_energy_to];
        statIds.from_battery = [source.stat_energy_from];
      }
      continue;
    }

    if (source.type !== "grid") {
      continue;
    }

    // grid source
    for (const flowFrom of source.flow_from) {
      if (statIds.from_grid) {
        statIds.from_grid.push(flowFrom.stat_energy_from);
      } else {
        statIds.from_grid = [flowFrom.stat_energy_from];
      }
    }
    for (const flowTo of source.flow_to) {
      if (statIds.to_grid) {
        statIds.to_grid.push(flowTo.stat_energy_to);
      } else {
        statIds.to_grid = [flowTo.stat_energy_to];
      }
    }
  }

  const summedData: EnergySumData = { total: {}, timestamps: [] };
  const timestamps = new Set<number>();
  Object.entries(statIds).forEach(([key, subStatIds]) => {
    const totalStats: Record<number, number> = {};
    const sets: Record<string, Record<number, number>> = {};
    let sum = 0;
    subStatIds!.forEach((id) => {
      const stats = compare ? data.statsCompare[id] : data.stats[id];
      if (!stats) {
        return;
      }
      const set = {};
      stats.forEach((stat) => {
        if (stat.change === null || stat.change === undefined) {
          return;
        }
        const val = stat.change;
        sum += val;
        totalStats[stat.start] =
          stat.start in totalStats ? totalStats[stat.start] + val : val;
        timestamps.add(stat.start);
      });
      sets[id] = set;
    });
    summedData[key] = totalStats;
    summedData.total[key] = sum;
  });

  summedData.timestamps = Array.from(timestamps).sort();

  return summedData;
};

export const computeConsumptionData = memoizeOne(
  (
    data: EnergySumData,
    compareData?: EnergySumData
  ): {
    consumption: EnergyConsumptionData;
    compareConsumption?: EnergyConsumptionData;
  } => {
    const consumption = computeConsumptionDataPartial(data);
    const compareConsumption = compareData
      ? computeConsumptionDataPartial(compareData)
      : undefined;
    return { consumption, compareConsumption };
  }
);

const computeConsumptionDataPartial = (
  data: EnergySumData
): EnergyConsumptionData => {
  const outData: EnergyConsumptionData = {
    used_total: {},
    grid_to_battery: {},
    battery_to_grid: {},
    solar_to_battery: {},
    solar_to_grid: {},
    used_solar: {},
    used_grid: {},
    used_battery: {},
    total: {
      used_total: 0,
      grid_to_battery: 0,
      battery_to_grid: 0,
      solar_to_battery: 0,
      solar_to_grid: 0,
      used_solar: 0,
      used_grid: 0,
      used_battery: 0,
    },
  };

  data.timestamps.forEach((t) => {
    const {
      grid_to_battery,
      battery_to_grid,
      used_solar,
      used_grid,
      used_battery,
      used_total,
      solar_to_battery,
      solar_to_grid,
    } = computeConsumptionSingle({
      from_grid: data.from_grid && (data.from_grid[t] ?? 0),
      to_grid: data.to_grid && (data.to_grid[t] ?? 0),
      solar: data.solar && (data.solar[t] ?? 0),
      to_battery: data.to_battery && (data.to_battery[t] ?? 0),
      from_battery: data.from_battery && (data.from_battery[t] ?? 0),
    });

    outData.used_total[t] = used_total;
    outData.total.used_total += used_total;
    outData.grid_to_battery[t] = grid_to_battery;
    outData.total.grid_to_battery += grid_to_battery;
    outData.battery_to_grid![t] = battery_to_grid;
    outData.total.battery_to_grid += battery_to_grid;
    outData.used_battery![t] = used_battery;
    outData.total.used_battery += used_battery;
    outData.used_grid![t] = used_grid;
    outData.total.used_grid += used_grid;
    outData.used_solar![t] = used_solar;
    outData.total.used_solar += used_solar;
    outData.solar_to_battery[t] = solar_to_battery;
    outData.total.solar_to_battery += solar_to_battery;
    outData.solar_to_grid[t] = solar_to_grid;
    outData.total.solar_to_grid += solar_to_grid;
  });

  return outData;
};

export const computeConsumptionSingle = (data: {
  from_grid: number | undefined;
  to_grid: number | undefined;
  solar: number | undefined;
  to_battery: number | undefined;
  from_battery: number | undefined;
}): {
  grid_to_battery: number;
  battery_to_grid: number;
  solar_to_battery: number;
  solar_to_grid: number;
  used_solar: number;
  used_grid: number;
  used_battery: number;
  used_total: number;
} => {
  let to_grid = Math.max(data.to_grid || 0, 0);
  let to_battery = Math.max(data.to_battery || 0, 0);
  let solar = Math.max(data.solar || 0, 0);
  let from_grid = Math.max(data.from_grid || 0, 0);
  let from_battery = Math.max(data.from_battery || 0, 0);

  const used_total =
    (from_grid || 0) +
    (solar || 0) +
    (from_battery || 0) -
    (to_grid || 0) -
    (to_battery || 0);

  let used_solar = 0;
  let grid_to_battery = 0;
  let battery_to_grid = 0;
  let solar_to_battery = 0;
  let solar_to_grid = 0;
  let used_battery = 0;
  let used_grid = 0;

  let used_total_remaining = Math.max(used_total, 0);
  // Consumption Priority
  // Solar -> Battery_In
  // Solar -> Grid_Out
  // Battery_Out -> Grid_Out
  // Grid_In -> Battery_In
  // Solar -> Consumption
  // Battery_Out -> Consumption
  // Grid_In -> Consumption

  // If we have more grid_in than consumption, the excess must be charging the battery
  // This must be accounted for before filling the battery from solar, or else the grid
  // input could be stranded with nowhere to go.
  const excess_grid_in_after_consumption = Math.max(
    0,
    Math.min(to_battery, from_grid - used_total_remaining)
  );
  grid_to_battery += excess_grid_in_after_consumption;
  to_battery -= excess_grid_in_after_consumption;
  from_grid -= excess_grid_in_after_consumption;

  // Fill the remainder of the battery input from solar
  // Solar -> Battery_In
  solar_to_battery = Math.min(solar, to_battery);
  to_battery -= solar_to_battery;
  solar -= solar_to_battery;

  // Solar -> Grid_Out
  solar_to_grid = Math.min(solar, to_grid);
  to_grid -= solar_to_grid;
  solar -= solar_to_grid;

  // Battery_Out -> Grid_Out
  battery_to_grid = Math.min(from_battery, to_grid);
  from_battery -= battery_to_grid;
  to_grid -= battery_to_grid;

  // Grid_In -> Battery_In (second pass)
  const grid_to_battery_2 = Math.min(from_grid, to_battery);
  grid_to_battery += grid_to_battery_2;
  from_grid -= grid_to_battery_2;
  to_battery -= grid_to_battery_2;

  // Solar -> Consumption
  used_solar = Math.min(used_total_remaining, solar);
  used_total_remaining -= used_solar;
  solar -= used_solar;

  // Battery_Out -> Consumption
  used_battery = Math.min(from_battery, used_total_remaining);
  from_battery -= used_battery;
  used_total_remaining -= used_battery;

  // Grid_In -> Consumption
  used_grid = Math.min(used_total_remaining, from_grid);
  from_grid -= used_grid;
  used_total_remaining -= from_grid;

  return {
    used_solar,
    used_grid,
    used_battery,
    used_total,
    grid_to_battery,
    battery_to_grid,
    solar_to_battery,
    solar_to_grid,
  };
};

export const formatConsumptionShort = (
  hass: HomeAssistant,
  consumption: number | null,
  unit: string
): string => {
  if (!consumption) {
    return `0 ${unit}`;
  }
  const units = ["kWh", "MWh", "GWh", "TWh"];
  let pickedUnit = unit;
  let val = consumption;
  let unitIndex = units.findIndex((u) => u === unit);
  if (unitIndex >= 0) {
    while (val >= 1000 && unitIndex < units.length - 1) {
      val /= 1000;
      unitIndex++;
    }
    pickedUnit = units[unitIndex];
  }
  return (
    formatNumber(val, hass.locale, {
      maximumFractionDigits: val < 10 ? 2 : val < 100 ? 1 : 0,
    }) +
    " " +
    pickedUnit
  );
};

export const calculateSolarConsumedGauge = (
  hasBattery: boolean,
  data: EnergySumData
): number | undefined => {
  if (!data.total.solar) {
    return undefined;
  }
  const { consumption, compareConsumption: _ } = computeConsumptionData(
    data,
    undefined
  );
  if (!hasBattery) {
    const solarProduction = data.total.solar;
    return (consumption.total.used_solar / solarProduction) * 100;
  }

  let solarConsumed = 0;
  let solarReturned = 0;
  const batteryLifo: { type: "solar" | "grid"; value: number }[] = [];

  // Here we will attempt to track consumed solar energy, as it routes through the battery and ultimately to consumption or grid.
  // At each timestamp we will track energy added to the battery (and its source), and we will drain this in Last-in/First-out order.
  // Energy leaving the battery when the stack is empty will just be ignored, as we cannot determine where it came from.
  // This is likely energy stored during a previous period.

  data.timestamps.forEach((t) => {
    solarConsumed += consumption.used_solar[t] ?? 0;
    solarReturned += consumption.solar_to_grid[t] ?? 0;

    if (consumption.grid_to_battery[t]) {
      batteryLifo.push({
        type: "grid",
        value: consumption.grid_to_battery[t],
      });
    }
    if (consumption.solar_to_battery[t]) {
      batteryLifo.push({
        type: "solar",
        value: consumption.solar_to_battery[t],
      });
    }

    let batteryToGrid = consumption.battery_to_grid[t] ?? 0;
    let usedBattery = consumption.used_battery[t] ?? 0;

    const drainBattery = function (amount: number): {
      energy: number;
      type: "solar" | "grid";
    } {
      const lastLifo = batteryLifo[batteryLifo.length - 1];
      const type = lastLifo.type;
      if (amount >= lastLifo.value) {
        const energy = lastLifo.value;
        batteryLifo.pop();
        return { energy, type };
      }
      lastLifo.value -= amount;
      return { energy: amount, type };
    };

    while (usedBattery > 0 && batteryLifo.length) {
      const { energy, type } = drainBattery(usedBattery);
      if (type === "solar") {
        solarConsumed += energy;
      }
      usedBattery -= energy;
    }

    while (batteryToGrid > 0 && batteryLifo.length) {
      const { energy, type } = drainBattery(batteryToGrid);
      if (type === "solar") {
        solarReturned += energy;
      }
      batteryToGrid -= energy;
    }
  });

  const totalProduction = solarConsumed + solarReturned;
  const hasSolarProduction = !!totalProduction;
  if (hasSolarProduction) {
    return (solarConsumed / totalProduction) * 100;
  }
  return undefined;
};
