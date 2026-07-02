import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import {
  getVisibleExternalCardConfigs,
  hasWaterDevices,
  hasWaterSource,
  isEnergyCardVisible,
} from "./energy-cards";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";

@customElement("water-view-strategy")
export class WaterViewStrategy extends ReactiveElement {
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

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    // No water sources or devices available
    if (!prefs || (!hasWaterDevices(prefs) && !hasWaterSource(prefs))) {
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

    if (isEnergyCardVisible("water", "energy-water-graph", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_water_graph_title"),
        type: "energy-water-graph",
        collection_key: collectionKey,
        grid_options: {
          columns: 24,
        },
      });
    }

    if (isEnergyCardVisible("water", "energy-sources-table", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["water"],
        grid_options: {
          columns: 12,
        },
      });
    }

    section.cards!.push(
      ...getVisibleExternalCardConfigs("water", prefs, hidden, collectionKey)
    );

    // Only include if we have at least 1 water device in the config.
    if (isEnergyCardVisible("water", "water-sankey", prefs, hidden)) {
      const showFloorsAndAreas = shouldShowFloorsAndAreas(
        prefs.device_consumption_water,
        hass,
        (d) => d.stat_consumption
      );
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.water_sankey_title"),
        type: "water-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsAndAreas,
        group_by_area: showFloorsAndAreas,
        grid_options: {
          columns: 24,
        },
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "water-view-strategy": WaterViewStrategy;
  }
}
