import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../constants";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { hasWaterSource, isEnergyCardVisible } from "./energy-cards";

@customElement("energy-overview-view-strategy")
export class EnergyOverviewViewStrategy extends ReactiveElement {
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
      dense_section_placement: true,
      max_columns: 3,
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

    if (isEnergyCardVisible("overview", "energy-distribution", prefs, hidden)) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.energy_distribution_title"
            ),
            type: "energy-distribution",
            collection_key: collectionKey,
          },
        ],
      });
    }

    if (
      isEnergyCardVisible("overview", "energy-sources-table", prefs, hidden)
    ) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.energy_sources_table_title"
            ),
            type: "energy-sources-table",
            collection_key: collectionKey,
            show_only_totals: true,
          },
        ],
      });
    }

    if (isEnergyCardVisible("overview", "power-sources-graph", prefs, hidden)) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.power_sources_graph_title"
            ),
            type: "power-sources-graph",
            collection_key: collectionKey,
            show_legend: false,
          },
        ],
      });
    }

    if (isEnergyCardVisible("overview", "energy-usage-graph", prefs, hidden)) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.energy_usage_graph_title"
            ),
            type: "energy-usage-graph",
            collection_key: collectionKey,
          },
        ],
      });
    }

    if (isEnergyCardVisible("overview", "energy-gas-graph", prefs, hidden)) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.energy_gas_graph_title"
            ),
            type: "energy-gas-graph",
            collection_key: collectionKey,
          },
        ],
      });
    }

    if (isEnergyCardVisible("overview", "energy-water-graph", prefs, hidden)) {
      view.sections!.push({
        type: "grid",
        cards: [
          hasWaterSource(prefs)
            ? {
                title: hass.localize(
                  "ui.panel.energy.cards.energy_water_graph_title"
                ),
                type: "energy-water-graph",
                collection_key: collectionKey,
              }
            : {
                title: hass.localize(
                  "ui.panel.energy.cards.water_sankey_title"
                ),
                type: "water-sankey",
                collection_key: collectionKey,
              },
        ],
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-overview-view-strategy": EnergyOverviewViewStrategy;
  }
}
