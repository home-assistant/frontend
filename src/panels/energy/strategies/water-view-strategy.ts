import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

@customElement("water-view-strategy")
export class WaterViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [{ type: "grid", cards: [] }],
    };

    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    const prefs = energyCollection.prefs;

    const hasWaterSources = prefs?.energy_sources.some(
      (source) => source.type === "water"
    );
    const hasWaterDevices = prefs?.device_consumption_water?.length;

    // No water sources available
    if (!prefs || (!hasWaterDevices && !hasWaterSources)) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    section.cards!.push({
      type: "energy-date-selection",
      collection_key: collectionKey,
    });
    section.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
    });

    if (hasWaterSources) {
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_water_graph_title"),
        type: "energy-water-graph",
        collection_key: collectionKey,
      });
    }

    if (hasWaterSources) {
      section.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["water"],
      });
    }

    // Only include if we have at least 1 water device in the config.
    if (hasWaterDevices) {
      const showFloorsNAreas = !prefs.device_consumption_water.some(
        (d) => d.included_in_stat
      );
      section.cards!.push({
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
    "water-view-strategy": WaterViewStrategy;
  }
}
