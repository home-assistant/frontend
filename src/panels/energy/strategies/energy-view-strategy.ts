import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { visibleEnergyCards } from "./energy-cards";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [],
      sidebar: {
        sections: [{ cards: [] }],
        visibility: [LARGE_SCREEN_CONDITION],
      },
      footer: {
        card: {
          type: "energy-date-selection",
          collection_key: collectionKey,
          opening_direction: "right",
          vertical_opening_direction: "up",
        },
      },
    };

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    // No energy sources available
    if (
      !prefs ||
      (prefs.device_consumption.length === 0 &&
        prefs.energy_sources.length === 0)
    ) {
      return view;
    }

    const mainCards: LovelaceCardConfig[] = [];
    const gaugeCards: LovelaceCardConfig[] = [];
    const sidebarSection = view.sidebar!.sections![0];

    // This view's card configs are built here; the catalog only says which are
    // visible. Placement differs by card: distribution and grid-balance go in
    // the sidebar (with a small-screen mirror), the gauges are grouped, and
    // everything else flows into the main column.
    const visibleTypes = new Set(
      visibleEnergyCards("electricity", prefs, hidden).map((c) => c.type)
    );

    const placeInSidebarWithMirror = (card: LovelaceCardConfig) => {
      sidebarSection.cards!.push(card);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [card],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    };

    if (visibleTypes.has("energy-distribution")) {
      placeInSidebarWithMirror({
        title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
        type: "energy-distribution",
        collection_key: collectionKey,
      });
    }

    if (visibleTypes.has("energy-grid-balance")) {
      placeInSidebarWithMirror({
        type: "energy-grid-balance",
        collection_key: collectionKey,
      });
    }

    const GAUGE_TYPES = [
      "energy-grid-neutrality-gauge",
      "energy-solar-consumed-gauge",
      "energy-self-sufficiency-gauge",
      "energy-carbon-consumed-gauge",
    ];
    for (const type of GAUGE_TYPES) {
      if (visibleTypes.has(type)) {
        gaugeCards.push({ type, collection_key: collectionKey });
      }
    }

    if (gaugeCards.length) {
      sidebarSection.cards!.push({
        type: "grid",
        columns: gaugeCards.length === 1 ? 1 : 2,
        cards: gaugeCards,
      });
      view.sections!.push({
        type: "grid",
        column_span: 1,
        visibility: [SMALL_SCREEN_CONDITION],
        cards:
          gaugeCards.length === 1
            ? [gaugeCards[0]]
            : gaugeCards.map((card) => ({
                ...card,
                grid_options: { columns: 6 },
              })),
      });
    }

    mainCards.push({
      type: "energy-compare",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    });

    if (visibleTypes.has("energy-usage-graph")) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
        type: "energy-usage-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (visibleTypes.has("energy-solar-graph")) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
        type: "energy-solar-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (visibleTypes.has("energy-sources-table")) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["grid", "solar", "battery"],
        grid_options: { columns: 36 },
      });
    }
    if (visibleTypes.has("energy-devices-detail-graph")) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_detail_graph_title"
        ),
        type: "energy-devices-detail-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (visibleTypes.has("energy-devices-graph")) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_graph_title"
        ),
        type: "energy-devices-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (visibleTypes.has("energy-sankey")) {
      const showFloorsAndAreas = shouldShowFloorsAndAreas(
        prefs.device_consumption,
        hass,
        (d) => d.stat_consumption
      );
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_sankey_title"),
        type: "energy-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsAndAreas,
        group_by_area: showFloorsAndAreas,
        grid_options: { columns: 36 },
      });
    }

    // Externally-registered electricity cards, at full width.
    const builtInTypes = new Set([
      "energy-distribution",
      "energy-grid-balance",
      ...GAUGE_TYPES,
      "energy-usage-graph",
      "energy-solar-graph",
      "energy-sources-table",
      "energy-devices-detail-graph",
      "energy-devices-graph",
      "energy-sankey",
    ]);
    for (const card of visibleEnergyCards("electricity", prefs, hidden)) {
      if (builtInTypes.has(card.type)) continue;
      mainCards.push({
        type: card.type,
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    view.sections!.push({
      type: "grid",
      column_span: 3,
      cards: mainCards,
    });

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-view-strategy": EnergyViewStrategy;
  }
}
