import {
  addDays,
  addHours,
  addMilliseconds,
  addMonths,
  differenceInDays,
  endOfToday,
  endOfYesterday,
  startOfToday,
  startOfYesterday,
} from "date-fns/esm";
import { Collection, getCollection } from "home-assistant-js-websocket";
import { groupBy } from "../common/util/group-by";
import { subscribeOne } from "../common/util/subscribe-one";
import { HomeAssistant } from "../types";
import { ConfigEntry, getConfigEntries } from "./config_entries";
import { subscribeEntityRegistry } from "./entity_registry";
import {
  fetchStatistics,
  getStatisticMetadata,
  Statistics,
  StatisticsMetaData,
  StatisticsUnitConfiguration,
} from "./recorder";

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

interface EnergySolarForecast {
  wh_hours: Record<string, number>;
}
export type EnergySolarForecasts = {
  [config_entry_id: string]: EnergySolarForecast;
};

export interface DeviceConsumptionEnergyPreference {
  // This is an ever increasing value
  stat_consumption: string;
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

  // kWh meter
  stat_energy_from: string;

  // $ meter
  stat_cost: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_price: string | null;
  number_energy_price: number | null;
  unit_of_measurement?: string | null;
}

type EnergySource =
  | SolarSourceTypeEnergyPreference
  | GridSourceTypeEnergyPreference
  | BatterySourceTypeEnergyPreference
  | GasSourceTypeEnergyPreference;

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
  identifier: string;
  value?: unknown;
}

export interface EnergyPreferencesValidation {
  energy_sources: EnergyValidationIssue[][];
  device_consumption: EnergyValidationIssue[][];
}

export const getEnergyInfo = (hass: HomeAssistant) =>
  hass.callWS<EnergyInfo>({
    type: "energy/info",
  });

export const getEnergyPreferenceValidation = (hass: HomeAssistant) =>
  hass.callWS<EnergyPreferencesValidation>({
    type: "energy/validate",
  });

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

export interface FossilEnergyConsumption {
  [date: string]: number;
}

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
  co2SignalConfigEntry?: ConfigEntry;
  co2SignalEntity?: string;
  fossilEnergyConsumption?: FossilEnergyConsumption;
  fossilEnergyConsumptionCompare?: FossilEnergyConsumption;
}

export const getReferencedStatisticIds = (
  prefs: EnergyPreferences,
  info: EnergyInfo
): string[] => {
  const statIDs: string[] = [];

  for (const source of prefs.energy_sources) {
    if (source.type === "solar") {
      statIDs.push(source.stat_energy_from);
      continue;
    }

    if (source.type === "gas") {
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

  return statIDs;
};

const getEnergyData = async (
  hass: HomeAssistant,
  prefs: EnergyPreferences,
  start: Date,
  end?: Date,
  compare?: boolean
): Promise<EnergyData> => {
  const [configEntries, entityRegistryEntries, info] = await Promise.all([
    getConfigEntries(hass, { domain: "co2signal" }),
    subscribeOne(hass.connection, subscribeEntityRegistry),
    getEnergyInfo(hass),
  ]);

  const co2SignalConfigEntry = configEntries.length
    ? configEntries[0]
    : undefined;

  let co2SignalEntity: string | undefined;

  if (co2SignalConfigEntry) {
    for (const entry of entityRegistryEntries) {
      if (entry.config_entry_id !== co2SignalConfigEntry.entry_id) {
        continue;
      }

      // The integration offers 2 entities. We want the % one.
      const co2State = hass.states[entry.entity_id];
      if (!co2State || co2State.attributes.unit_of_measurement !== "%") {
        continue;
      }

      co2SignalEntity = co2State.entity_id;
      break;
    }
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
  const statIDs = getReferencedStatisticIds(prefs, info);

  const dayDifference = differenceInDays(end || new Date(), start);
  const period =
    dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour";

  // Subtract 1 hour from start to get starting point data
  const startMinHour = addHours(start, -1);

  const lengthUnit = hass.config.unit_system.length || "";
  const units: StatisticsUnitConfiguration = {
    energy: "kWh",
    volume: lengthUnit === "km" ? "m³" : "ft³",
  };

  const stats = await fetchStatistics(
    hass!,
    startMinHour,
    end,
    statIDs,
    period,
    units
  );

  let statsCompare;
  let startCompare;
  let endCompare;
  if (compare) {
    if (dayDifference > 27 && dayDifference < 32) {
      // When comparing a month, we want to start at the begining of the month
      startCompare = addMonths(start, -1);
    } else {
      startCompare = addDays(start, (dayDifference + 1) * -1);
    }

    const compareStartMinHour = addHours(startCompare, -1);
    endCompare = addMilliseconds(start, -1);

    statsCompare = await fetchStatistics(
      hass!,
      compareStartMinHour,
      endCompare,
      statIDs,
      period,
      units
    );
  }

  let fossilEnergyConsumption: FossilEnergyConsumption | undefined;
  let fossilEnergyConsumptionCompare: FossilEnergyConsumption | undefined;

  if (co2SignalEntity !== undefined) {
    fossilEnergyConsumption = await getFossilEnergyConsumption(
      hass!,
      start,
      consumptionStatIDs,
      co2SignalEntity,
      end,
      dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour"
    );
    if (compare) {
      fossilEnergyConsumptionCompare = await getFossilEnergyConsumption(
        hass!,
        startCompare,
        consumptionStatIDs,
        co2SignalEntity,
        endCompare,
        dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour"
      );
    }
  }

  Object.values(stats).forEach((stat) => {
    // if the start of the first value is after the requested period, we have the first data point, and should add a zero point
    if (stat.length && new Date(stat[0].start) > startMinHour) {
      stat.unshift({
        ...stat[0],
        start: startMinHour.toISOString(),
        end: startMinHour.toISOString(),
        sum: 0,
        state: 0,
      });
    }
  });

  const statsMetadataArray = await getStatisticMetadata(hass, statIDs);
  const statsMetadata: Record<string, StatisticsMetaData> = {};
  statsMetadataArray.forEach((x) => {
    statsMetadata[x.statistic_id] = x;
  });

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
    co2SignalConfigEntry,
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

      if (collection._refreshTimeout) {
        clearTimeout(collection._refreshTimeout);
      }

      if (
        collection._active &&
        (!collection.end || collection.end > new Date())
      ) {
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
  // Set start to start of today if we have data for today, otherwise yesterday
  collection.start = now.getHours() > 0 ? startOfToday() : startOfYesterday();
  collection.end = now.getHours() > 0 ? endOfToday() : endOfYesterday();

  const scheduleUpdatePeriod = () => {
    collection._updatePeriodTimeout = window.setTimeout(
      () => {
        collection.start = startOfToday();
        collection.end = endOfToday();
        scheduleUpdatePeriod();
      },
      addHours(endOfToday(), 1).getTime() - Date.now() // Switch to next day an hour after the day changed
    );
  };
  scheduleUpdatePeriod();

  collection.clearPrefs = () => {
    collection.prefs = undefined;
  };
  collection.setPeriod = (newStart: Date, newEnd?: Date) => {
    collection.start = newStart;
    collection.end = newEnd;
    if (
      collection.start.getTime() === startOfToday().getTime() &&
      collection.end?.getTime() === endOfToday().getTime() &&
      !collection._updatePeriodTimeout
    ) {
      scheduleUpdatePeriod();
    } else if (collection._updatePeriodTimeout) {
      clearTimeout(collection._updatePeriodTimeout);
      collection._updatePeriodTimeout = undefined;
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
export type EnergyGasUnitClass = typeof energyGasUnitClass[number];

export const getEnergyGasUnitClass = (
  prefs: EnergyPreferences,
  statisticsMetaData: Record<string, StatisticsMetaData> = {},
  excludeSource?: string
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
): string | undefined => {
  const unitClass = getEnergyGasUnitClass(prefs, statisticsMetaData);
  if (unitClass === undefined) {
    return undefined;
  }
  return unitClass === "energy"
    ? "kWh"
    : hass.config.unit_system.length === "km"
    ? "m³"
    : "ft³";
};
