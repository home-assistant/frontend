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
import { isEnergyCardVisible } from "./energy-cards";
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

    if (
      isEnergyCardVisible("electricity", "energy-distribution", prefs, hidden)
    ) {
      const distributionCard = {
        title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
        type: "energy-distribution",
        collection_key: collectionKey,
      };
      sidebarSection.cards!.push(distributionCard);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [distributionCard],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    }

    // Only include if we have both grid import and export configured
    if (
      isEnergyCardVisible("electricity", "energy-grid-balance", prefs, hidden)
    ) {
      const gridResultCard = {
        type: "energy-grid-balance",
        collection_key: collectionKey,
      };
      sidebarSection.cards!.push(gridResultCard);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        visibility: [SMALL_SCREEN_CONDITION],
        cards: [gridResultCard],
      });
    }

    // Only include if we have a grid source & return.
    if (
      isEnergyCardVisible(
        "electricity",
        "energy-grid-neutrality-gauge",
        prefs,
        hidden
      )
    ) {
      gaugeCards.push({
        type: "energy-grid-neutrality-gauge",
        collection_key: collectionKey,
      });
    }

    // Only include if we have a solar source & return.
    if (
      isEnergyCardVisible(
        "electricity",
        "energy-solar-consumed-gauge",
        prefs,
        hidden
      )
    ) {
      gaugeCards.push({
        type: "energy-solar-consumed-gauge",
        collection_key: collectionKey,
      });
    }

    // Only include if we have a solar source & grid.
    if (
      isEnergyCardVisible(
        "electricity",
        "energy-self-sufficiency-gauge",
        prefs,
        hidden
      )
    ) {
      gaugeCards.push({
        type: "energy-self-sufficiency-gauge",
        collection_key: collectionKey,
      });
    }

    // Only include if we have a grid
    if (
      isEnergyCardVisible(
        "electricity",
        "energy-carbon-consumed-gauge",
        prefs,
        hidden
      )
    ) {
      gaugeCards.push({
        type: "energy-carbon-consumed-gauge",
        collection_key: collectionKey,
      });
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

    // Only include if we have a grid or battery.
    if (
      isEnergyCardVisible("electricity", "energy-usage-graph", prefs, hidden)
    ) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
        type: "energy-usage-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    // Only include if we have a solar source.
    if (
      isEnergyCardVisible("electricity", "energy-solar-graph", prefs, hidden)
    ) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
        type: "energy-solar-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    if (
      isEnergyCardVisible("electricity", "energy-sources-table", prefs, hidden)
    ) {
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

    // Device cards: each only included if we have at least 1 device configured.
    if (
      isEnergyCardVisible(
        "electricity",
        "energy-devices-detail-graph",
        prefs,
        hidden
      )
    ) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_detail_graph_title"
        ),
        type: "energy-devices-detail-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (
      isEnergyCardVisible("electricity", "energy-devices-graph", prefs, hidden)
    ) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_graph_title"
        ),
        type: "energy-devices-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }
    if (isEnergyCardVisible("electricity", "energy-sankey", prefs, hidden)) {
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
