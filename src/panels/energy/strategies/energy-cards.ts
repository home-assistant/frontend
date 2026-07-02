import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { energyCardRegistrations } from "../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../types";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";

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

/**
 * Everything a card's config builder needs. Passed in by the view strategy at
 * generation time, so the catalog never imports runtime state — it only
 * receives it.
 */
export interface EnergyCardContext {
  hass: HomeAssistant;
  prefs: EnergyPreferences;
  collectionKey: string;
}

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
  /** Builds the Lovelace card config to render for this entry. */
  buildConfig: (ctx: EnergyCardContext) => LovelaceCardConfig;
}

/** A visible card and the config a strategy should push for it. */
export interface VisibleEnergyCard {
  type: string;
  config: LovelaceCardConfig;
}

const energyCardKey = (view: EnergyViewPath, cardType: string): string =>
  `${view}.${cardType}`;

const entry = (
  view: EnergyViewPath,
  cardType: string,
  labelKey: LocalizeKeys,
  isApplicable: (prefs: EnergyPreferences) => boolean,
  buildConfig: (ctx: EnergyCardContext) => LovelaceCardConfig
): EnergyCardEntry => ({
  key: energyCardKey(view, cardType),
  view,
  type: cardType,
  getLabel: (localize) => localize(labelKey),
  isApplicable,
  buildConfig,
});

/**
 * Shared config for the four sankey cards, which differ only by title, target
 * device list, entity-id accessor, and grid width. The floors/areas grouping is
 * derived from the current preferences via `shouldShowFloorsAndAreas`.
 */
const sankeyConfig = (
  ctx: EnergyCardContext,
  type: string,
  titleKey: LocalizeKeys,
  devices: DeviceConsumptionEnergyPreference[],
  getEntityId: (
    device: DeviceConsumptionEnergyPreference
  ) => string | undefined,
  columns: number
): LovelaceCardConfig => {
  const showFloorsAndAreas = shouldShowFloorsAndAreas(
    devices,
    ctx.hass,
    getEntityId
  );
  return {
    title: ctx.hass.localize(titleKey),
    type,
    collection_key: ctx.collectionKey,
    group_by_floor: showFloorsAndAreas,
    group_by_area: showFloorsAndAreas,
    grid_options: { columns },
  };
};

const ENERGY_CARD_CATALOG: readonly EnergyCardEntry[] = [
  // --- Overview ---
  // Overview cards each render in their own grid section, at the default
  // width, so they carry no grid_options.
  entry(
    "overview",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
      type: "energy-distribution",
      collection_key: collectionKey,
    })
  ),
  entry(
    "overview",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => p.energy_sources.length > 0,
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_sources_table_title"),
      type: "energy-sources-table",
      collection_key: collectionKey,
      show_only_totals: true,
    })
  ),
  entry(
    "overview",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title",
    (p) => hasPowerSources(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
      type: "power-sources-graph",
      collection_key: collectionKey,
      show_legend: false,
    })
  ),
  entry(
    "overview",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title",
    (p) => hasGridSource(p) || hasBattery(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
      type: "energy-usage-graph",
      collection_key: collectionKey,
    })
  ),
  entry(
    "overview",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title",
    (p) => hasGasSource(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_gas_graph_title"),
      type: "energy-gas-graph",
      collection_key: collectionKey,
    })
  ),
  // One toggle gates the water row, which renders energy-water-graph (sources)
  // or, with only water devices, water-sankey.
  entry(
    "overview",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title",
    (p) => hasWaterSource(p) || hasWaterDevices(p),
    ({ hass, prefs, collectionKey }) =>
      hasWaterSource(prefs)
        ? {
            title: hass.localize(
              "ui.panel.energy.cards.energy_water_graph_title"
            ),
            type: "energy-water-graph",
            collection_key: collectionKey,
          }
        : {
            title: hass.localize("ui.panel.energy.cards.water_sankey_title"),
            type: "water-sankey",
            collection_key: collectionKey,
          }
  ),

  // --- Electricity ---
  entry(
    "electricity",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title",
    (p) => hasGridSource(p) || hasBattery(p) || hasSolar(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
      type: "energy-distribution",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-grid-balance",
    "ui.panel.energy.cards.energy_grid_balance_title",
    (p) => hasGridSource(p) && hasReturn(p),
    ({ collectionKey }) => ({
      type: "energy-grid-balance",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-grid-neutrality-gauge",
    "ui.panel.energy.cards.energy_grid_neutrality_gauge_title",
    (p) => hasReturn(p),
    ({ collectionKey }) => ({
      type: "energy-grid-neutrality-gauge",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-solar-consumed-gauge",
    "ui.panel.energy.cards.energy_solar_consumed_gauge_title",
    (p) => hasSolar(p) && hasReturn(p),
    ({ collectionKey }) => ({
      type: "energy-solar-consumed-gauge",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-self-sufficiency-gauge",
    "ui.panel.energy.cards.energy_self_sufficiency_gauge_title",
    (p) => hasSolar(p) && hasGridSource(p),
    ({ collectionKey }) => ({
      type: "energy-self-sufficiency-gauge",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-carbon-consumed-gauge",
    "ui.panel.energy.cards.energy_carbon_consumed_gauge_title",
    (p) => hasGridSource(p),
    ({ collectionKey }) => ({
      type: "energy-carbon-consumed-gauge",
      collection_key: collectionKey,
    })
  ),
  entry(
    "electricity",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title",
    (p) => hasGridSource(p) || hasBattery(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
      type: "energy-usage-graph",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "electricity",
    "energy-solar-graph",
    "ui.panel.energy.cards.energy_solar_graph_title",
    (p) => hasSolar(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
      type: "energy-solar-graph",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "electricity",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasGridSource(p) || hasSolar(p) || hasBattery(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_sources_table_title"),
      type: "energy-sources-table",
      collection_key: collectionKey,
      types: ["grid", "solar", "battery"],
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "electricity",
    "energy-devices-detail-graph",
    "ui.panel.energy.cards.energy_devices_detail_graph_title",
    (p) => hasDeviceConsumption(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize(
        "ui.panel.energy.cards.energy_devices_detail_graph_title"
      ),
      type: "energy-devices-detail-graph",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "electricity",
    "energy-devices-graph",
    "ui.panel.energy.cards.energy_devices_graph_title",
    (p) => hasDeviceConsumption(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_devices_graph_title"),
      type: "energy-devices-graph",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "electricity",
    "energy-sankey",
    "ui.panel.energy.cards.energy_sankey_title",
    (p) => hasDeviceConsumption(p),
    (ctx) =>
      sankeyConfig(
        ctx,
        "energy-sankey",
        "ui.panel.energy.cards.energy_sankey_title",
        ctx.prefs.device_consumption,
        (d) => d.stat_consumption,
        36
      )
  ),

  // --- Gas ---
  entry(
    "gas",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title",
    (p) => hasGasSource(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_gas_graph_title"),
      type: "energy-gas-graph",
      collection_key: collectionKey,
      grid_options: { columns: 24 },
    })
  ),
  entry(
    "gas",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasGasSource(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_sources_table_title"),
      type: "energy-sources-table",
      collection_key: collectionKey,
      types: ["gas"],
      grid_options: { columns: 12 },
    })
  ),

  // --- Water ---
  entry(
    "water",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title",
    (p) => hasWaterSource(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_water_graph_title"),
      type: "energy-water-graph",
      collection_key: collectionKey,
      grid_options: { columns: 24 },
    })
  ),
  entry(
    "water",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title",
    (p) => hasWaterSource(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.energy_sources_table_title"),
      type: "energy-sources-table",
      collection_key: collectionKey,
      types: ["water"],
      grid_options: { columns: 12 },
    })
  ),
  entry(
    "water",
    "water-sankey",
    "ui.panel.energy.cards.water_sankey_title",
    (p) => hasWaterDevices(p),
    (ctx) =>
      sankeyConfig(
        ctx,
        "water-sankey",
        "ui.panel.energy.cards.water_sankey_title",
        ctx.prefs.device_consumption_water,
        (d) => d.stat_consumption,
        24
      )
  ),

  // --- Now (power) ---
  entry(
    "now",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title",
    (p) => hasPowerSources(p),
    ({ hass, collectionKey }) => ({
      title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
      type: "power-sources-graph",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    })
  ),
  entry(
    "now",
    "power-sankey",
    "ui.panel.energy.cards.power_sankey_title",
    (p) => hasPowerDevices(p),
    (ctx) =>
      sankeyConfig(
        ctx,
        "power-sankey",
        "ui.panel.energy.cards.power_sankey_title",
        ctx.prefs.device_consumption,
        (d) => d.stat_rate,
        36
      )
  ),
  entry(
    "now",
    "water-flow-sankey",
    "ui.panel.energy.cards.water_flow_sankey_title",
    (p) => hasWaterRateDevices(p),
    (ctx) =>
      sankeyConfig(
        ctx,
        "water-flow-sankey",
        "ui.panel.energy.cards.water_flow_sankey_title",
        ctx.prefs.device_consumption_water,
        (d) => d.stat_rate,
        36
      )
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
        buildConfig: ({ collectionKey }) => ({
          type,
          collection_key: collectionKey,
          grid_options: { columns: 36 },
        }),
      };
    }),
];

/**
 * The cards a view strategy should render, in catalog order (built-ins first,
 * then externally-registered cards). Each entry's config is already built from
 * the given context, so the strategy only decides placement.
 */
export const visibleEnergyCards = (
  view: EnergyViewPath,
  ctx: EnergyCardContext,
  hidden: string[] | undefined
): VisibleEnergyCard[] =>
  getEnergyCardCatalog()
    .filter(
      (c) =>
        c.view === view && c.isApplicable(ctx.prefs) && !hidden?.includes(c.key)
    )
    .map((c) => ({ type: c.type, config: c.buildConfig(ctx) }));

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
 * Whether a single built-in card is visible: it must be in the catalog, apply
 * to the current preferences, and not be hidden by the user. `visibleEnergyCards`
 * is the batch equivalent used by the strategies; this predicate expresses the
 * same rule for one `(view, cardType)` pair.
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
