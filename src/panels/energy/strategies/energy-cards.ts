import type { LocalizeKeys } from "../../../common/translations/localize";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";

/** Strategy config shared by the per-view energy strategies. */
export interface EnergyViewStrategyConfig extends LovelaceStrategyConfig {
  collection_key?: string;
  hidden_cards?: string[];
}

export type EnergyViewPath =
  | "overview"
  | "electricity"
  | "gas"
  | "water"
  | "now";

// --- Applicability helpers -------------------------------------------------
// Source-shape predicates shared by the catalog entries below, the view
// strategies (for view-level decisions and badges), and the dashboard
// strategy. Card applicability itself lives in the catalog: strategies decide
// whether to emit a card through `isEnergyCardVisible()`, so they never
// re-derive these conditions inline and can never disagree with the catalog.

export const hasGridSource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some(
    (source): source is GridSourceTypeEnergyPreference =>
      source.type === "grid" &&
      (!!source.stat_energy_from || !!source.stat_energy_to)
  );

export const hasReturn = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some(
    (source) => source.type === "grid" && !!source.stat_energy_to
  );

export const hasSolar = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) => source.type === "solar");

export const hasBattery = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) => source.type === "battery");

/** Any electricity-relevant source: grid, solar, or battery. */
export const hasEnergySource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) =>
    ["grid", "solar", "battery"].includes(source.type)
  );

export const hasGasSource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) => source.type === "gas");

export const hasWaterSource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) => source.type === "water");

export const hasWaterDevices = (prefs: EnergyPreferences): boolean =>
  (prefs.device_consumption_water?.length ?? 0) > 0;

export const hasDeviceConsumption = (prefs: EnergyPreferences): boolean =>
  prefs.device_consumption.length > 0;

export const hasPowerSources = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some((source) => {
    if (source.type === "solar" && source.stat_rate) return true;
    if (source.type === "battery" && source.stat_rate) return true;
    if (source.type === "grid") {
      return !!source.stat_rate || !!source.power_config;
    }
    return false;
  });

export const hasPowerDevices = (prefs: EnergyPreferences): boolean =>
  prefs.device_consumption.some((device) => device.stat_rate);

export const hasWaterRateDevices = (prefs: EnergyPreferences): boolean =>
  (prefs.device_consumption_water ?? []).some((device) => device.stat_rate);

/** A water source exposing a live flow-rate statistic. */
export const hasWaterRateSource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some(
    (source) => source.type === "water" && !!source.stat_rate
  );

/** A gas source exposing a live flow-rate statistic. */
export const hasGasRateSource = (prefs: EnergyPreferences): boolean =>
  prefs.energy_sources.some(
    (source) => source.type === "gas" && !!source.stat_rate
  );

// --- Card catalog ----------------------------------------------------------

export interface EnergyCardCatalogEntry {
  /** Stable identifier and storage token: `<view>.<cardType>`. */
  key: string;
  view: EnergyViewPath;
  /** Localize key for the label shown in the customise dialog. */
  labelKey: LocalizeKeys;
  /** Whether this card is emitted for the given preferences. */
  isApplicable: (prefs: EnergyPreferences) => boolean;
}

export const energyCardKey = (view: EnergyViewPath, cardType: string): string =>
  `${view}.${cardType}`;

const entry = (
  view: EnergyViewPath,
  cardType: string,
  labelKey: LocalizeKeys,
  isApplicable: (prefs: EnergyPreferences) => boolean
): EnergyCardCatalogEntry => ({
  key: energyCardKey(view, cardType),
  view,
  labelKey,
  isApplicable,
});

export const ENERGY_CARD_CATALOG: readonly EnergyCardCatalogEntry[] = [
  // --- Overview ---
  entry(
    "overview",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p)
  ),
  entry(
    "overview",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => p.energy_sources.length > 0
  ),
  entry(
    "overview",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title",
    (p) => hasPowerSources(p)
  ),
  entry(
    "overview",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title",
    (p) => hasGridSource(p) || hasBattery(p)
  ),
  entry(
    "overview",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title",
    (p) => hasGasSource(p)
  ),
  // One toggle gates the water row, which renders energy-water-graph (sources)
  // or, with only water devices, water-sankey.
  entry(
    "overview",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title",
    (p) => hasWaterSource(p) || hasWaterDevices(p)
  ),

  // --- Electricity ---
  entry(
    "electricity",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p)
  ),
  entry(
    "electricity",
    "energy-grid-balance",
    "ui.panel.energy.cards.energy_grid_balance_title",
    (p) => hasGridSource(p) && hasReturn(p)
  ),
  entry(
    "electricity",
    "energy-grid-neutrality-gauge",
    "ui.panel.energy.cards.energy_grid_neutrality_gauge_title",
    (p) => hasReturn(p)
  ),
  entry(
    "electricity",
    "energy-solar-consumed-gauge",
    "ui.panel.energy.cards.energy_solar_consumed_gauge_title",
    (p) => hasSolar(p) && hasReturn(p)
  ),
  entry(
    "electricity",
    "energy-self-sufficiency-gauge",
    "ui.panel.energy.cards.energy_self_sufficiency_gauge_title",
    (p) => hasSolar(p) && hasGridSource(p)
  ),
  entry(
    "electricity",
    "energy-carbon-consumed-gauge",
    "ui.panel.energy.cards.energy_carbon_consumed_gauge_title",
    (p) => hasGridSource(p)
  ),
  entry(
    "electricity",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title",
    (p) => hasGridSource(p) || hasBattery(p)
  ),
  entry(
    "electricity",
    "energy-solar-graph",
    "ui.panel.energy.cards.energy_solar_graph_title",
    (p) => hasSolar(p)
  ),
  entry(
    "electricity",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasGridSource(p) || hasSolar(p) || hasBattery(p)
  ),
  entry(
    "electricity",
    "energy-devices-detail-graph",
    "ui.panel.energy.cards.energy_devices_detail_graph_title",
    (p) => hasDeviceConsumption(p)
  ),
  entry(
    "electricity",
    "energy-devices-graph",
    "ui.panel.energy.cards.energy_devices_graph_title",
    (p) => hasDeviceConsumption(p)
  ),
  entry(
    "electricity",
    "energy-sankey",
    "ui.panel.energy.cards.energy_sankey_title",
    (p) => hasDeviceConsumption(p)
  ),

  // --- Gas ---
  entry(
    "gas",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title",
    (p) => hasGasSource(p)
  ),
  entry(
    "gas",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasGasSource(p)
  ),

  // --- Water ---
  entry(
    "water",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title",
    (p) => hasWaterSource(p)
  ),
  entry(
    "water",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasWaterSource(p)
  ),
  entry(
    "water",
    "water-sankey",
    "ui.panel.energy.cards.water_sankey_title",
    (p) => hasWaterDevices(p)
  ),

  // --- Now (power) ---
  entry(
    "now",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title",
    (p) => hasPowerSources(p)
  ),
  entry(
    "now",
    "power-sankey",
    "ui.panel.energy.cards.power_sankey_title",
    (p) => hasPowerDevices(p)
  ),
  entry(
    "now",
    "water-flow-sankey",
    "ui.panel.energy.cards.water_flow_sankey_title",
    (p) => hasWaterRateDevices(p)
  ),
];

// --- Lookup helpers --------------------------------------------------------

const ENERGY_CARD_CATALOG_BY_KEY = new Map<string, EnergyCardCatalogEntry>(
  ENERGY_CARD_CATALOG.map((c) => [c.key, c])
);

/** The catalog entry for a `(view, cardType)` pair, or undefined if unknown. */
export const energyCardEntry = (
  view: EnergyViewPath,
  cardType: string
): EnergyCardCatalogEntry | undefined =>
  ENERGY_CARD_CATALOG_BY_KEY.get(energyCardKey(view, cardType));

export const isEnergyCardHidden = (
  view: EnergyViewPath,
  cardType: string,
  hidden: string[] | undefined
): boolean => !!hidden?.includes(energyCardKey(view, cardType));

/**
 * Single source of truth for whether a view strategy should emit a card: the
 * card must be in the catalog, apply to the current preferences, and not be
 * hidden by the user. Strategies call this instead of re-deriving the
 * applicability conditions inline, so the catalog and the strategies can never
 * disagree on what "applicable" means.
 */
export const isEnergyCardVisible = (
  view: EnergyViewPath,
  cardType: string,
  prefs: EnergyPreferences,
  hidden: string[] | undefined
): boolean => {
  const cardEntry = energyCardEntry(view, cardType);
  return (
    !!cardEntry &&
    cardEntry.isApplicable(prefs) &&
    !hidden?.includes(cardEntry.key)
  );
};

/** Keys of all catalog cards that apply to the given preferences for a view. */
export const applicableEnergyCardKeys = (
  view: EnergyViewPath,
  prefs: EnergyPreferences
): string[] =>
  ENERGY_CARD_CATALOG.filter(
    (c) => c.view === view && c.isApplicable(prefs)
  ).map((c) => c.key);

/** True when a view has applicable cards but every one of them is hidden. */
export const isEnergyViewEmpty = (
  view: EnergyViewPath,
  prefs: EnergyPreferences,
  hidden: string[] | undefined
): boolean => {
  const applicable = applicableEnergyCardKeys(view, prefs);
  return (
    applicable.length > 0 && applicable.every((key) => hidden?.includes(key))
  );
};
