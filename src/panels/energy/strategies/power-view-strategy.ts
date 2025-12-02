import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
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

    view.type = "sidebar";

    view.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
    });

    if (hasPowerDevices) {
      const showFloorsNAreas = !prefs.device_consumption.some(
        (d) => d.included_in_stat
      );
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sankey_title"),
        type: "power-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsNAreas,
        group_by_area: showFloorsNAreas,
      });
    }

    if (hasPowerSources) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
        type: "power-sources-graph",
        collection_key: collectionKey,
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
