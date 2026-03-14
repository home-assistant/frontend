import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
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
    await energyCollection.refresh();
    const prefs = energyCollection.prefs;

    const hasPowerSources = prefs?.energy_sources.some(
      (source) =>
        (source.type === "solar" && source.stat_rate) ||
        (source.type === "battery" && source.stat_rate) ||
        (source.type === "grid" && source.power?.length)
    );
    const hasPowerDevices = prefs?.device_consumption.some(
      (device) => device.stat_rate
    );

    // No power sources configured
    if (!prefs || (!hasPowerSources && !hasPowerDevices)) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    if (hasPowerSources) {
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
        type: "power-sources-graph",
        collection_key: collectionKey,
        grid_options: {
          columns: 36,
        },
      });
    }

    if (hasPowerDevices) {
      const showFloorsNAreas = !prefs.device_consumption.some(
        (d) => d.included_in_stat
      );
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sankey_title"),
        type: "power-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsNAreas,
        group_by_area: showFloorsNAreas,
        grid_options: {
          columns: 36,
        },
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-view-strategy": PowerViewStrategy;
  }
}
