import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { hasHeatSource, isEnergyCardVisible } from "./energy-cards";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("heat-view-strategy")
export class HeatViewStrategy extends ReactiveElement {
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
      max_columns: 3,
      sections: [{ type: "grid", cards: [], column_span: 3 }],
      footer: {
        card: {
          type: "energy-date-selection",
          collection_key: collectionKey,
          opening_direction: "right",
          vertical_opening_direction: "up",
        },
      },
    };

    const energyCollection = getEnergyDataCollection(hass.connection, {
      callWS: hass.callWS,
      entities: hass.entities,
      states: hass.states,
      locale: hass.locale,
      config: hass.config,
      panelUrl: hass.panelUrl,
      key: collectionKey,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    // No heat sources available
    if (!prefs || !hasHeatSource(prefs)) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    section.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
      grid_options: {
        columns: 36,
      },
    });

    if (isEnergyCardVisible("heat", "energy-heat-graph", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_heat_graph_title"),
        type: "energy-heat-graph",
        collection_key: collectionKey,
        grid_options: {
          columns: 24,
        },
      });
    }

    if (isEnergyCardVisible("heat", "energy-sources-table", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["heat"],
        grid_options: {
          columns: 12,
        },
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "heat-view-strategy": HeatViewStrategy;
  }
}
