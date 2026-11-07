import type { HassEntities } from "home-assistant-js-websocket";
import type { DeviceRegistryEntry } from "./device/device_registry";
import type {
  BatterySourceTypeEnergyPreference,
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "./energy";
import {
  getEnergyGasUnitClass,
  emptyBatteryEnergyPreference,
  emptyGasEnergyPreference,
  emptyGridSourceEnergyPreference,
  emptySolarEnergyPreference,
  emptyWaterEnergyPreference,
} from "./energy";
import type { EntityRegistryDisplayEntry } from "./entity/entity_registry";
import type { StatisticsMetaData } from "./recorder";

export type EnergySuggestionSlot =
  | "grid_import"
  | "grid_export"
  | "solar"
  | "battery"
  | "gas"
  | "water"
  | "device";

export type EnergySuggestionTab = "electricity" | "gas" | "water";

// The energy settings tab a suggested slot belongs to.
export const suggestionTab = (
  slot: EnergySuggestionSlot
): EnergySuggestionTab =>
  slot === "gas" || slot === "water" ? slot : "electricity";

export interface EnergyMeterSuggestion {
  statisticId: string;
  slot: EnergySuggestionSlot;
  // Slots the user can switch to; a battery needs its paired statistic.
  slots: EnergySuggestionSlot[];
  // Battery: the charge statistic, statisticId is the discharge one.
  pairedStatisticId?: string;
  deviceId?: string;
}

export interface EnergySuggestionInput {
  statistics: StatisticsMetaData[];
  preferences: EnergyPreferences;
  states: HassEntities;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  dismissed?: string[];
}

export const GRID_DOMAINS = [
  "dsmr",
  "dsmr_reader",
  "homewizard",
  "iskra",
  "opower",
  "p1_monitor",
  "smart_meter_texas",
  "tibber",
  "youless",
  "zonneplan",
];

export const SOLAR_DOMAINS = [
  "apsystems",
  "aurora_abb_powerone",
  "enphase_envoy",
  "fronius",
  "goodwe",
  "growatt_server",
  "imeon_inverter",
  "kostal_plenticore",
  "saj",
  "sma",
  "solaredge",
  "solarlog",
  "solarman",
  "solax",
  "sunweg",
];

const ENERGY_UNIT_CLASS = "energy";
const VOLUME_UNIT_CLASS = "volume";

const SLOT_ORDER: EnergySuggestionSlot[] = [
  "grid_import",
  "grid_export",
  "solar",
  "battery",
  "gas",
  "water",
  "device",
];

const ENERGY_SLOTS: EnergySuggestionSlot[] = [
  "grid_import",
  "grid_export",
  "solar",
  "device",
];

const RE_GRID = /import|export|return|deliver|grid|tarif/;
const RE_EXPORT = /export|return|deliver|produc|inject|feed/;
const RE_TARIFF = /tarif|(^|_)(t[1-4]|high|low|normal|peak|off_?peak)(_|$)/;
const RE_SOLAR = /solar|(^|[_.])pv|yield|produc|generat/;
const RE_HOUSE = /consum|load|house|home/;
const RE_NET = /(^|[_.])net(_|$)|combined/;
const RE_DISCHARGE = /discharg/;
const RE_CHARGE = /charg/;
const RE_BATTERY = /battery|storage/;
const RE_CYCLE = /today|daily|yesterday|week|month|year/;

type Kind =
  | { slot: "grid_import" | "grid_export"; tariff: boolean }
  | { slot: "solar" | "gas" | "water" | "device" }
  | { slot: "battery"; charge: boolean };

interface Classified {
  statisticId: string;
  kind: Kind;
  unitClass: string;
  groupId: string;
  group: string;
  deviceId?: string;
  cycle: boolean;
  configured: boolean;
}

const searchText = (
  meta: StatisticsMetaData,
  input: EnergySuggestionInput
): string => {
  const entity = input.entities[meta.statistic_id];
  const stateObj = input.states[meta.statistic_id];
  return [
    meta.statistic_id,
    meta.name,
    entity?.translation_key,
    entity?.name,
    stateObj?.attributes.friendly_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
};

const platformOf = (
  meta: StatisticsMetaData,
  input: EnergySuggestionInput
): string | undefined =>
  input.entities[meta.statistic_id]?.platform ??
  (meta.statistic_id.includes(":") ? meta.source : undefined);

const classify = (
  meta: StatisticsMetaData,
  input: EnergySuggestionInput
): Kind | undefined => {
  const stateObj = input.states[meta.statistic_id];
  const deviceClass = stateObj?.attributes.device_class;
  const text = searchText(meta, input);

  if (meta.unit_class === VOLUME_UNIT_CLASS) {
    if (deviceClass === "gas" || deviceClass === "water") {
      return { slot: deviceClass };
    }
    if (text.includes("gas")) {
      return { slot: "gas" };
    }
    return text.includes("water") ? { slot: "water" } : undefined;
  }
  if (deviceClass === "gas") {
    return { slot: "gas" };
  }

  if (RE_NET.test(text)) {
    return undefined;
  }

  // Home batteries (e.g. the HomeWizard Plug-In Battery) also name their
  // meters import and export, so they go before the grid rules.
  const deviceId = input.entities[meta.statistic_id]?.device_id;
  const model = deviceId ? input.devices[deviceId]?.model : undefined;
  if (
    RE_BATTERY.test(text) ||
    (model && RE_BATTERY.test(model.toLowerCase()))
  ) {
    return {
      slot: "battery",
      charge: !RE_DISCHARGE.test(text) && !RE_EXPORT.test(text),
    };
  }

  const platform = platformOf(meta, input);
  if (
    (platform && GRID_DOMAINS.includes(platform)) ||
    RE_GRID.test(text) ||
    (text.includes("consum") && RE_TARIFF.test(text))
  ) {
    return {
      slot: RE_EXPORT.test(text) ? "grid_export" : "grid_import",
      tariff: RE_TARIFF.test(text),
    };
  }

  if (RE_CHARGE.test(text)) {
    return { slot: "battery", charge: !RE_DISCHARGE.test(text) };
  }

  if (platform && SOLAR_DOMAINS.includes(platform)) {
    // Consumption meters on an inverter measure the whole house.
    return RE_HOUSE.test(text) ? undefined : { slot: "solar" };
  }
  if (RE_SOLAR.test(text)) {
    return { slot: "solar" };
  }

  return { slot: "device" };
};

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

const isDerivedFromConfigured = (
  statisticId: string,
  input: EnergySuggestionInput,
  configured: Set<string>
): boolean => {
  const platform = input.entities[statisticId]?.platform;
  // A utility meter only repeats (part of) another meter.
  if (platform === "utility_meter") {
    return true;
  }
  const source = input.states[statisticId]?.attributes.source;
  return (
    platform === "integration" &&
    typeof source === "string" &&
    configured.has(source)
  );
};

const groupKey = (kind: Kind, groupId: string) => `${groupId}|${kind.slot}`;

/**
 * Energy statistics that aren't in the energy preferences yet, each with the
 * slot it most likely belongs in. Keeps one meter per device and slot, and
 * prefers tariff meters over the total of the same meter.
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

  const classified: Classified[] = [];
  for (const meta of input.statistics) {
    if (
      !meta.has_sum ||
      (meta.unit_class !== ENERGY_UNIT_CLASS &&
        meta.unit_class !== VOLUME_UNIT_CLASS)
    ) {
      continue;
    }
    const isConfigured = configured.has(meta.statistic_id);
    // Configured meters without a state still count for deduplication.
    if (
      !isConfigured &&
      !meta.statistic_id.includes(":") &&
      !input.states[meta.statistic_id]
    ) {
      continue;
    }
    if (
      !isConfigured &&
      (dismissed.has(meta.statistic_id) ||
        isDerivedFromConfigured(meta.statistic_id, input, configured))
    ) {
      continue;
    }
    const kind = classify(meta, input);
    if (!kind) {
      continue;
    }
    const deviceId = input.entities[meta.statistic_id]?.device_id;
    const groupId = deviceId ?? meta.statistic_id;
    classified.push({
      statisticId: meta.statistic_id,
      kind,
      unitClass: meta.unit_class!,
      groupId,
      group: groupKey(kind, groupId),
      deviceId,
      cycle: RE_CYCLE.test(searchText(meta, input)),
      configured: isConfigured,
    });
  }

  const groups = new Map<string, Classified[]>();
  for (const item of classified) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }

  const context: GroupContext = {
    gasUnitClass,
    reading: (statisticId) => {
      const value = Number(input.states[statisticId]?.state);
      return Number.isFinite(value) ? value : undefined;
    },
    hasDeviceMeter: (groupId) =>
      groups.has(groupKey({ slot: "device" }, groupId)),
  };
  const suggestions: EnergyMeterSuggestion[] = [];
  for (const items of groups.values()) {
    suggestions.push(...suggestionsForGroup(items, context));
  }

  return suggestions.sort(
    (a, b) =>
      SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) ||
      a.statisticId.localeCompare(b.statisticId)
  );
};

const preferTotals = (items: Classified[]) =>
  [...items].sort(
    (a, b) =>
      Number(a.cycle) - Number(b.cycle) ||
      a.statisticId.localeCompare(b.statisticId)
  );

interface GroupContext {
  gasUnitClass?: string;
  reading: (statisticId: string) => number | undefined;
  hasDeviceMeter: (groupId: string) => boolean;
}

// Slots a meter's unit fits; gas only when it matches the configured gas unit.
const allowedSlots = (
  unitClass: string,
  gasUnitClass: string | undefined
): EnergySuggestionSlot[] => {
  const slots: EnergySuggestionSlot[] =
    unitClass === VOLUME_UNIT_CLASS ? ["water"] : [...ENERGY_SLOTS];
  return !gasUnitClass || gasUnitClass === unitClass
    ? ["gas", ...slots]
    : slots;
};

const toSuggestion = (
  item: Classified,
  context: GroupContext,
  pairedStatisticId?: string
): EnergyMeterSuggestion[] => {
  if (pairedStatisticId) {
    return [
      {
        statisticId: item.statisticId,
        slot: "battery",
        slots: ["battery"],
        pairedStatisticId,
        deviceId: item.deviceId,
      },
    ];
  }
  const slots = allowedSlots(item.unitClass, context.gasUnitClass);
  if (!slots.includes(item.kind.slot)) {
    return [];
  }
  return [
    {
      statisticId: item.statisticId,
      slot: item.kind.slot,
      slots: SLOT_ORDER.filter((slot) => slots.includes(slot)),
      deviceId: item.deviceId,
    },
  ];
};

const suggestionsForGroup = (
  items: Classified[],
  context: GroupContext
): EnergyMeterSuggestion[] => {
  const kind = items[0].kind;
  const open = items.filter((item) => !item.configured && !item.cycle);

  if (kind.slot === "grid_import" || kind.slot === "grid_export") {
    const isTariff = (item: Classified) =>
      "tariff" in item.kind && item.kind.tariff;
    // A configured total already covers its tariffs, and the other way round.
    if (items.some((item) => item.configured && !isTariff(item))) {
      return [];
    }
    const hasTariffs = items.some(isTariff);
    return open
      .filter((item) => !hasTariffs || isTariff(item))
      .flatMap((item) => toSuggestion(item, context));
  }

  if (kind.slot === "device") {
    // Channels of one device are separate meters; only counters with the same
    // reading repeat each other.
    const seen = new Set(
      items
        .filter((item) => item.configured)
        .map((item) => context.reading(item.statisticId))
    );
    const suggestions: EnergyMeterSuggestion[] = [];
    for (const item of preferTotals(open)) {
      const reading = context.reading(item.statisticId);
      if (reading !== undefined && seen.has(reading)) {
        continue;
      }
      seen.add(reading);
      suggestions.push(...toSuggestion(item, context));
    }
    return suggestions;
  }

  if (items.some((item) => item.configured)) {
    return [];
  }

  if (kind.slot === "battery") {
    const isCharge = (item: Classified) =>
      "charge" in item.kind && item.kind.charge;
    const charge = preferTotals(items.filter(isCharge))[0];
    const discharge = preferTotals(items.filter((item) => !isCharge(item)))[0];
    if (charge && discharge) {
      return toSuggestion(discharge, context, charge.statisticId);
    }
    // A lone charge meter is usually an EV charger or other appliance, unless
    // its device already has a consumption meter.
    if (context.hasDeviceMeter(items[0].groupId)) {
      return [];
    }
    return preferTotals(items)
      .flatMap((item) =>
        toSuggestion({ ...item, kind: { slot: "device" } }, context)
      )
      .slice(0, 1);
  }

  return preferTotals(items)
    .flatMap((item) => toSuggestion(item, context))
    .slice(0, 1);
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
 * Preferences with the suggestion added. Grid meters fill the open side of an
 * existing grid connection first, so an import and an export added one after
 * the other end up as one connection.
 */
export const addEnergySuggestion = (
  preferences: EnergyPreferences,
  suggestion: EnergyMeterSuggestion,
  slot: EnergySuggestionSlot = suggestion.slot
): EnergyPreferences => {
  const sources = preferences.energy_sources;
  const id = suggestion.statisticId;
  switch (slot) {
    case "grid_import":
      return {
        ...preferences,
        energy_sources: fillGridSide(sources, "stat_energy_from", id),
      };
    case "grid_export":
      return {
        ...preferences,
        energy_sources: fillGridSide(sources, "stat_energy_to", id),
      };
    case "solar":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptySolarEnergyPreference(), stat_energy_from: id },
        ],
      };
    case "battery": {
      const battery: BatterySourceTypeEnergyPreference = {
        ...emptyBatteryEnergyPreference(),
        stat_energy_from: id,
        stat_energy_to: suggestion.pairedStatisticId ?? "",
      };
      return { ...preferences, energy_sources: [...sources, battery] };
    }
    case "gas":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptyGasEnergyPreference(), stat_energy_from: id },
        ],
      };
    case "water":
      return {
        ...preferences,
        energy_sources: [
          ...sources,
          { ...emptyWaterEnergyPreference(), stat_energy_from: id },
        ],
      };
    default:
      return {
        ...preferences,
        device_consumption: [
          ...preferences.device_consumption,
          { stat_consumption: id },
        ],
      };
  }
};

export const suggestionStatisticIds = (suggestion: EnergyMeterSuggestion) =>
  suggestion.pairedStatisticId
    ? [suggestion.statisticId, suggestion.pairedStatisticId]
    : [suggestion.statisticId];
