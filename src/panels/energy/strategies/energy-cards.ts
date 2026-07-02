import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { energyCardRegistrations } from "../../../data/lovelace_custom_cards";

/** Strategy config shared by the per-view energy strategies. */
export interface EnergyViewStrategyConfig extends LovelaceStrategyConfig {
  collection_key?: string;
  hidden_cards?: string[];
}

export type EnergyViewPath =
  "overview" | "electricity" | "gas" | "water" | "now";

// --- Applicability helpers -------------------------------------------------
// Source-shape predicates shared by the catalog entries below, the view
// strategies (for view-level decisions and badges), and the dashboard
// strategy. Card applicability itself lives in the catalog: strategies render
// whatever `visibleEnergyCards()` returns, so they never re-derive these
// conditions inline and can never disagree with the catalog.

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

/** Uniform shape for both built-in and externally-registered energy card entries. */
export interface EnergyCardEntry {
  /** Stable identifier and storage token: `<view>.<cardType>`. */
  key: string;
  view: EnergyViewPath;
  /** Bare card type, e.g. `energy-usage-graph` or `custom:my-card`. */
  type: string;
  /** Returns the display label for the "Customise energy" dialog. */
  getLabel: (localize: LocalizeFunc) => string;
  /** Whether this card is emitted for the given preferences. */
  isApplicable: (prefs: EnergyPreferences) => boolean;
}

/**
 * A card the strategy should render: its type and a resolver for its title.
 * The strategy owns the card's config (grid width, placement, etc.); the
 * catalog only says which cards are visible and what they're called.
 */
export interface VisibleEnergyCard {
  type: string;
  getLabel: (localize: LocalizeFunc) => string;
}

const energyCardKey = (view: EnergyViewPath, cardType: string): string =>
  `${view}.${cardType}`;

const entry = (
  view: EnergyViewPath,
  cardType: string,
  labelKey: LocalizeKeys,
  isApplicable: (prefs: EnergyPreferences) => boolean
): EnergyCardEntry => ({
  key: energyCardKey(view, cardType),
  view,
  type: cardType,
  getLabel: (localize) => localize(labelKey),
  isApplicable,
});

const ENERGY_CARD_CATALOG: readonly EnergyCardEntry[] = [
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

// --- External card registry ------------------------------------------------

/**
 * Default applicability predicate for each view, applied when a HACS author
 * does not supply their own `isApplicable` function. A card registered for the
 * "gas" view, for example, will only appear when a gas source is configured —
 * matching the behaviour of the built-in gas-view cards.
 */
const VIEW_DEFAULT_APPLICABILITY: Record<
  EnergyViewPath,
  (prefs: EnergyPreferences) => boolean
> = {
  overview: hasEnergySource,
  electricity: hasEnergySource,
  gas: hasGasSource,
  water: hasWaterSource,
  now: hasPowerSources,
};

/**
 * The full energy card catalog: built-in entries followed by any cards
 * registered via `window.registerEnergyCard`. All entries share the
 * `EnergyCardEntry` interface, so callers need no type guards.
 */
export const getEnergyCardCatalog = (): readonly EnergyCardEntry[] => [
  ...ENERGY_CARD_CATALOG,
  ...energyCardRegistrations
    .filter((r) => r.view in VIEW_DEFAULT_APPLICABILITY)
    .map((r): EnergyCardEntry => {
      const view = r.view as EnergyViewPath;
      const type = `custom:${r.type}`;
      const label = r.label ?? r.type;
      return {
        key: energyCardKey(view, type),
        view,
        type,
        getLabel: () => label,
        isApplicable:
          (r.isApplicable as
            ((prefs: EnergyPreferences) => boolean) | undefined) ??
          VIEW_DEFAULT_APPLICABILITY[view],
      };
    }),
];

/**
 * The cards a view strategy should render, in catalog order (built-ins first,
 * then externally-registered cards). Returns only what a strategy can't derive
 * itself — the card's type and title — leaving the card's config and placement
 * to the strategy.
 */
export const visibleEnergyCards = (
  view: EnergyViewPath,
  prefs: EnergyPreferences,
  hidden: string[] | undefined
): VisibleEnergyCard[] =>
  getEnergyCardCatalog()
    .filter(
      (c) =>
        c.view === view && c.isApplicable(prefs) && !hidden?.includes(c.key)
    )
    .map((c) => ({ type: c.type, getLabel: c.getLabel }));

/**
 * A per-card config override for a view: the card type plus any options that
 * differ from the view's default (a narrower grid, a source-type filter, sankey
 * grouping). The title is filled in from the catalog, so it is not repeated.
 */
export type EnergyViewCardConfig = Partial<LovelaceCardConfig> & {
  type: string;
};

/**
 * Assemble the card list for a single-section view. Every visible card (built-in
 * and externally registered) renders in catalog order as
 * `{ default, ...override }`, with its title taken from the catalog. The view
 * supplies a `defaultConfig` shared by all its cards and per-card `overrides`
 * for the ones that differ; placement stays with the strategy.
 */
export const buildEnergyViewCards = (
  view: EnergyViewPath,
  prefs: EnergyPreferences,
  hidden: string[] | undefined,
  localize: LocalizeFunc,
  collectionKey: string,
  defaultConfig: Partial<LovelaceCardConfig>,
  overrides: EnergyViewCardConfig[] = []
): LovelaceCardConfig[] => {
  const byType = new Map(overrides.map((o) => [o.type, o]));
  return visibleEnergyCards(view, prefs, hidden).map((card) => ({
    collection_key: collectionKey,
    title: card.getLabel(localize),
    ...defaultConfig,
    type: card.type,
    ...byType.get(card.type),
  }));
};

// --- Lookup helpers --------------------------------------------------------

const ENERGY_CARD_CATALOG_BY_KEY = new Map<string, EnergyCardEntry>(
  ENERGY_CARD_CATALOG.map((c) => [c.key, c])
);

const energyCardEntry = (
  view: EnergyViewPath,
  cardType: string
): EnergyCardEntry | undefined =>
  ENERGY_CARD_CATALOG_BY_KEY.get(energyCardKey(view, cardType));

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

const applicableEnergyCardKeys = (
  view: EnergyViewPath,
  prefs: EnergyPreferences
): string[] =>
  getEnergyCardCatalog()
    .filter((c) => c.view === view && c.isApplicable(prefs))
    .map((c) => c.key);

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
