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
  | "solar"
  | "gas"
  | "water"
  | "now";

// --- Applicability helpers -------------------------------------------------
// These mirror, one-to-one, the conditions the individual view strategies use
// to decide whether to emit a card. The catalog and the strategies must agree
// on what "applicable" means, so the conditions live here and are reused.

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

export const hasPowerWaterDevices = (prefs: EnergyPreferences): boolean =>
  (prefs.device_consumption_water ?? []).some((device) => device.stat_rate);

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

  // --- Solar ---
  entry(
    "solar",
    "energy-solar-scene",
    "ui.panel.energy.cards.energy_solar_scene_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p)
  ),
  entry(
    "solar",
    "energy-solar-scene-timeline",
    "ui.panel.energy.cards.energy_solar_scene_timeline_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p)
  ),
  entry(
    "solar",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p)
  ),
  entry(
    "solar",
    "energy-grid-balance",
    "ui.panel.energy.cards.energy_grid_balance_title",
    (p) => hasGridSource(p) && hasReturn(p)
  ),
  entry(
    "solar",
    "energy-grid-neutrality-gauge",
    "ui.panel.energy.cards.energy_grid_neutrality_gauge_title",
    (p) => hasReturn(p)
  ),
  entry(
    "solar",
    "energy-solar-consumed-gauge",
    "ui.panel.energy.cards.energy_solar_consumed_gauge_title",
    (p) => hasSolar(p) && hasReturn(p)
  ),
  entry(
    "solar",
    "energy-self-sufficiency-gauge",
    "ui.panel.energy.cards.energy_self_sufficiency_gauge_title",
    (p) => hasSolar(p) && hasGridSource(p)
  ),
  entry(
    "solar",
    "energy-solar-graph",
    "ui.panel.energy.cards.energy_solar_graph_title",
    (p) => hasSolar(p)
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
    (p) => hasPowerWaterDevices(p)
  ),
];

// --- Lookup helpers --------------------------------------------------------

export const isEnergyCardHidden = (
  view: EnergyViewPath,
  cardType: string,
  hidden: string[] | undefined
): boolean => !!hidden?.includes(energyCardKey(view, cardType));

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
