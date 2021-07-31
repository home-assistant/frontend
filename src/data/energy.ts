import { Collection, getCollection } from "home-assistant-js-websocket";
import { subscribeOne } from "../common/util/subscribe-one";
import { HomeAssistant } from "../types";
import { ConfigEntry, getConfigEntries } from "./config_entries";
import { subscribeEntityRegistry } from "./entity_registry";
import { fetchStatistics, Statistics } from "./history";

export const emptyFlowFromGridSourceEnergyPreference =
  (): FlowFromGridSourceEnergyPreference => ({
    stat_energy_from: "",
    stat_cost: null,
    entity_energy_from: null,
    entity_energy_price: null,
    number_energy_price: null,
  });

export const emptyFlowToGridSourceEnergyPreference =
  (): FlowToGridSourceEnergyPreference => ({
    stat_energy_to: "",
    stat_compensation: null,
    entity_energy_to: null,
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
  entity_energy_from: string | null;
  entity_energy_price: string | null;
  number_energy_price: number | null;
}

export interface FlowToGridSourceEnergyPreference {
  // kWh meter
  stat_energy_to: string;

  // $ meter
  stat_compensation: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_to: string | null;
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

type EnergySource =
  | SolarSourceTypeEnergyPreference
  | GridSourceTypeEnergyPreference;

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumptionEnergyPreference[];
}

export interface EnergyInfo {
  cost_sensors: Record<string, string>;
}

export const getEnergyInfo = (hass: HomeAssistant) =>
  hass.callWS<EnergyInfo>({
    type: "energy/info",
  });

export const getEnergyPreferences = (hass: HomeAssistant) =>
  hass.callWS<EnergyPreferences>({
    type: "energy/get_prefs",
  });

export const saveEnergyPreferences = (
  hass: HomeAssistant,
  prefs: Partial<EnergyPreferences>
) =>
  hass.callWS<EnergyPreferences>({
    type: "energy/save_prefs",
    ...prefs,
  });

interface EnergySourceByType {
  grid?: GridSourceTypeEnergyPreference[];
  solar?: SolarSourceTypeEnergyPreference[];
}

export const energySourcesByType = (prefs: EnergyPreferences) => {
  const types: EnergySourceByType = {};
  for (const source of prefs.energy_sources) {
    if (source.type in types) {
      types[source.type]!.push(source as any);
    } else {
      types[source.type] = [source as any];
    }
  }
  return types;
};

export interface EnergyData {
  start: Date;
  end?: Date;
  prefs: EnergyPreferences;
  info: EnergyInfo;
  stats: Statistics;
  co2SignalConfigEntry?: ConfigEntry;
  co2SignalEntity?: string;
}

const getEnergyData = async (
  hass: HomeAssistant,
  prefs: EnergyPreferences,
  start: Date,
  end?: Date
): Promise<EnergyData> => {
  const [configEntries, entityRegistryEntries, info] = await Promise.all([
    getConfigEntries(hass),
    subscribeOne(hass.connection, subscribeEntityRegistry),
    getEnergyInfo(hass),
  ]);

  const co2SignalConfigEntry = configEntries.find(
    (entry) => entry.domain === "co2signal"
  );

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

  const statIDs: string[] = [];

  if (co2SignalEntity !== undefined) {
    statIDs.push(co2SignalEntity);
  }

  for (const source of prefs.energy_sources) {
    if (source.type === "solar") {
      statIDs.push(source.stat_energy_from);
      continue;
    }

    // grid source
    for (const flowFrom of source.flow_from) {
      statIDs.push(flowFrom.stat_energy_from);
    }
    for (const flowTo of source.flow_to) {
      statIDs.push(flowTo.stat_energy_to);
    }
  }

  const stats = await fetchStatistics(hass!, start, end, statIDs);

  return {
    start,
    end,
    info,
    prefs,
    stats,
    co2SignalConfigEntry,
    co2SignalEntity,
  };
};

export interface EnergyCollection extends Collection<EnergyData> {
  start: Date;
  end?: Date;
  prefs?: EnergyPreferences;
  clearPrefs(): void;
  setPeriod(newStart: Date, newEnd?: Date): void;
}

export const getEnergyDataCollection = (
  hass: HomeAssistant,
  prefs?: EnergyPreferences
): EnergyCollection => {
  if ((hass.connection as any)._energy) {
    return (hass.connection as any)._energy;
  }

  const collection = getCollection<EnergyData>(
    hass.connection,
    "_energy",
    async () => {
      if (!collection.prefs) {
        // This will raise if not found.
        // Detect by checking `e.code === "not_found"
        collection.prefs = await getEnergyPreferences(hass);
      }

      return getEnergyData(
        hass,
        collection.prefs,
        collection.start,
        collection.end
      );
    }
  ) as EnergyCollection;

  collection.prefs = prefs;
  collection.start = new Date();
  collection.start.setHours(0, 0, 0, 0);
  collection.start.setTime(collection.start.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

  collection.clearPrefs = () => {
    collection.prefs = undefined;
  };
  collection.setPeriod = (newStart: Date, newEnd?: Date) => {
    collection.start = newStart;
    collection.end = newEnd;
  };
  return collection;
};
