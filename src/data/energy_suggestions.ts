import type { HassEntities } from "home-assistant-js-websocket";
import type { EnergyPreferences } from "./energy";
import { getEnergyGasUnitClass } from "./energy";
import type { StatisticsMetaData } from "./recorder";

export type EnergySuggestionSlot =
  | "grid_import"
  | "grid_export"
  | "solar"
  | "battery_charge"
  | "battery_discharge"
  | "home"
  | "device"
  | "gas"
  | "device_gas"
  | "water"
  | "device_water";

export type EnergySuggestionTab = "electricity" | "gas" | "water";

export interface EnergyMeterSuggestion {
  statisticId: string;
  tab: EnergySuggestionTab;
  // The user picks one when there is more than one.
  slots: EnergySuggestionSlot[];
}

export interface EnergySuggestionInput {
  statistics: StatisticsMetaData[];
  preferences: EnergyPreferences;
  states: HassEntities;
  dismissed?: string[];
}

export interface EnergySuggestionEditor {
  /** The editor page under the tab that adds the meter */
  kind: "grid" | "solar" | "battery" | "home" | "device" | "gas" | "water";
  /** The field of the new item the meter is preselected in */
  stat: "stat_energy_from" | "stat_energy_to" | "stat_consumption";
}

export const ENERGY_SUGGESTION_EDITORS: Record<
  EnergySuggestionSlot,
  EnergySuggestionEditor
> = {
  grid_import: { kind: "grid", stat: "stat_energy_from" },
  grid_export: { kind: "grid", stat: "stat_energy_to" },
  solar: { kind: "solar", stat: "stat_energy_from" },
  battery_charge: { kind: "battery", stat: "stat_energy_to" },
  battery_discharge: { kind: "battery", stat: "stat_energy_from" },
  home: { kind: "home", stat: "stat_energy_to" },
  device: { kind: "device", stat: "stat_consumption" },
  gas: { kind: "gas", stat: "stat_energy_from" },
  device_gas: { kind: "device", stat: "stat_consumption" },
  water: { kind: "water", stat: "stat_energy_from" },
  device_water: { kind: "device", stat: "stat_consumption" },
};

// The dashboard has one whole-home meter at most.
const electricitySlots = (hasHome: boolean): EnergySuggestionSlot[] => [
  "grid_import",
  "grid_export",
  "solar",
  "battery_charge",
  "battery_discharge",
  ...(hasHome ? [] : (["home"] as const)),
  "device",
];

const GAS_SLOTS: EnergySuggestionSlot[] = ["gas", "device_gas"];

const WATER_SLOTS: EnergySuggestionSlot[] = ["water", "device_water"];

const collectStatisticIds = (value: unknown, ids: Set<string>) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStatisticIds(item, ids));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key.startsWith("stat_") && typeof item === "string" && item) {
      ids.add(item);
    } else if (typeof item === "object") {
      collectStatisticIds(item, ids);
    }
  }
};

export const configuredStatisticIds = (
  preferences: EnergyPreferences
): Set<string> => {
  const ids = new Set<string>();
  collectStatisticIds(preferences, ids);
  return ids;
};

/**
 * Energy, gas and water sensors with statistics that aren't in the energy
 * preferences yet. The device class decides the tab; the user picks the slot.
 */
export const computeEnergySuggestions = (
  input: EnergySuggestionInput
): EnergyMeterSuggestion[] => {
  const configured = configuredStatisticIds(input.preferences);
  const dismissed = new Set(input.dismissed);
  const sourceOf = (id: string) => input.states[id]?.attributes.source;
  const configuredSources = new Set([...configured].map(sourceOf));
  // All gas meters of the dashboard share one unit class.
  const gasUnitClass = getEnergyGasUnitClass(
    input.preferences,
    undefined,
    Object.fromEntries(
      input.statistics.map((meta) => [meta.statistic_id, meta])
    )
  );

  const electricity = electricitySlots(
    input.preferences.energy_sources.some((source) => source.type === "home")
  );

  const suggestions: EnergyMeterSuggestion[] = [];
  for (const meta of input.statistics) {
    const statisticId = meta.statistic_id;
    if (
      !meta.has_sum ||
      configured.has(statisticId) ||
      configured.has(sourceOf(statisticId)) ||
      configuredSources.has(statisticId) ||
      dismissed.has(statisticId)
    ) {
      continue;
    }
    const deviceClass = input.states[statisticId]?.attributes.device_class;
    if (deviceClass === "energy" && meta.unit_class === "energy") {
      suggestions.push({
        statisticId,
        tab: "electricity",
        slots: electricity,
      });
    } else if (
      deviceClass === "gas" &&
      (meta.unit_class === "volume" || meta.unit_class === "energy") &&
      (!gasUnitClass || meta.unit_class === gasUnitClass)
    ) {
      suggestions.push({ statisticId, tab: "gas", slots: GAS_SLOTS });
    } else if (deviceClass === "water" && meta.unit_class === "volume") {
      suggestions.push({ statisticId, tab: "water", slots: WATER_SLOTS });
    }
  }
  return suggestions;
};

/**
 * The dismissed statistics with the new one added, dropping statistics that
 * no longer exist.
 */
export const updateDismissedSuggestions = (
  dismissed: string[],
  statisticId: string,
  statistics: StatisticsMetaData[]
): string[] => {
  const existing = new Set(statistics.map((meta) => meta.statistic_id));
  return [
    ...dismissed.filter((id) => id !== statisticId && existing.has(id)),
    statisticId,
  ];
};
