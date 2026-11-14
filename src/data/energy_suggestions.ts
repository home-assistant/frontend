import type { HassEntities } from "home-assistant-js-websocket";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "./energy";
import {
  getEnergyGasUnitClass,
  emptyGasEnergyPreference,
  emptyGridSourceEnergyPreference,
  emptySolarEnergyPreference,
  emptyWaterEnergyPreference,
} from "./energy";
import type { StatisticsMetaData } from "./recorder";

export type EnergySuggestionSlot =
  "grid_import" | "grid_export" | "solar" | "gas" | "water" | "device";

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

const ELECTRICITY_SLOTS: EnergySuggestionSlot[] = [
  "grid_import",
  "grid_export",
  "solar",
  "device",
];

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
  // All gas meters of the dashboard share one unit class.
  const gasUnitClass = getEnergyGasUnitClass(
    input.preferences,
    undefined,
    Object.fromEntries(
      input.statistics.map((meta) => [meta.statistic_id, meta])
    )
  );

  const suggestions: EnergyMeterSuggestion[] = [];
  for (const meta of input.statistics) {
    const statisticId = meta.statistic_id;
    if (
      !meta.has_sum ||
      configured.has(statisticId) ||
      dismissed.has(statisticId)
    ) {
      continue;
    }
    const deviceClass = input.states[statisticId]?.attributes.device_class;
    if (deviceClass === "energy" && meta.unit_class === "energy") {
      suggestions.push({
        statisticId,
        tab: "electricity",
        slots: ELECTRICITY_SLOTS,
      });
    } else if (
      deviceClass === "gas" &&
      (meta.unit_class === "energy" || meta.unit_class === "volume") &&
      (!gasUnitClass || gasUnitClass === meta.unit_class)
    ) {
      suggestions.push({ statisticId, tab: "gas", slots: ["gas"] });
    } else if (deviceClass === "water" && meta.unit_class === "volume") {
      suggestions.push({ statisticId, tab: "water", slots: ["water"] });
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

const fillGridSide = (
  sources: EnergyPreferences["energy_sources"],
  side: "stat_energy_from" | "stat_energy_to",
  statisticId: string
) => {
  const open = sources.find(
    (source): source is GridSourceTypeEnergyPreference =>
      source.type === "grid" && !source[side]
  );
  if (open) {
    return sources.map((source) =>
      source === open ? { ...open, [side]: statisticId } : source
    );
  }
  return [
    ...sources,
    { ...emptyGridSourceEnergyPreference(), [side]: statisticId },
  ];
};

/**
 * Preferences with the meter added to the slot. Grid meters fill the open
 * side of an existing grid connection first, so an import and an export added
 * one after the other end up as one connection.
 */
export const addEnergySuggestion = (
  preferences: EnergyPreferences,
  statisticId: string,
  slot: EnergySuggestionSlot
): EnergyPreferences => {
  const sources = preferences.energy_sources;
  switch (slot) {
    case "grid_import":
      return {
        ...preferences,
        energy_sources: fillGridSide(sources, "stat_energy_from", statisticId),
      };
    case "grid_export":
      return {
        ...preferences,
        energy_sources: fillGridSide(sources, "stat_energy_to", statisticId),
      };
    case "solar":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptySolarEnergyPreference(), stat_energy_from: statisticId },
        ],
      };
    case "gas":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptyGasEnergyPreference(), stat_energy_from: statisticId },
        ],
      };
    case "water":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptyWaterEnergyPreference(), stat_energy_from: statisticId },
        ],
      };
    default:
      return {
        ...preferences,
        device_consumption: [
          ...preferences.device_consumption,
          { stat_consumption: statisticId },
        ],
      };
  }
};
