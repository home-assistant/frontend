import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";

@customElement("energy-water-view-strategy")
export class EnergyWaterViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view: LovelaceViewConfig = { cards: [] };

    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    const prefs = energyCollection.prefs;

    // No water sources available
    if (
      !prefs ||
      (!prefs.device_consumption_water?.length &&
        !prefs.energy_sources.some((source) => source.type === "water"))
    ) {
      return view;
    }

    view.type = "sidebar";

    const hasWater = prefs.energy_sources.some(
      (source) => source.type === "water"
    );

    view.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
    });

    if (hasWater) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_water_graph_title"),
        type: "energy-water-graph",
        collection_key: collectionKey,
      });
    }

    if (hasWater) {
      view.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["water"],
      });
    }

    // Only include if we have at least 1 water device in the config.
    if (prefs.device_consumption_water?.length) {
      const showFloorsNAreas = !prefs.device_consumption_water.some(
        (d) => d.included_in_stat
      );
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.water_sankey_title"),
        type: "water-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsNAreas,
        group_by_area: showFloorsNAreas,
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-water-view-strategy": EnergyWaterViewStrategy;
  }
}
