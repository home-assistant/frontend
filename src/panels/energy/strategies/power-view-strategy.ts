import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    await energyCollection.refresh();
    const prefs = energyCollection.prefs;

    const hasPowerSources = prefs?.energy_sources.some((source) => {
      if (source.type === "solar" && source.stat_rate) return true;
      if (source.type === "battery" && source.stat_rate) return true;
      if (source.type === "grid") {
        return !!source.stat_rate || !!source.power_config;
      }
      return false;
    });
    const hasPowerDevices = prefs?.device_consumption.some(
      (device) => device.stat_rate
    );
    const hasWaterDevices = prefs?.device_consumption_water.some(
      (device) => device.stat_rate
    );
    const hasWaterSources = prefs?.energy_sources.some(
      (source) => source.type === "water" && source.stat_rate
    );
    const hasGasSources = prefs?.energy_sources.some(
      (source) => source.type === "gas" && source.stat_rate
    );

    const chartsSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };
    const badges: LovelaceBadgeConfig[] = [];

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [chartsSection],
    };

    // No sources configured
    if (
      !prefs ||
      (!hasPowerSources &&
        !hasPowerDevices &&
        !hasWaterDevices &&
        !hasWaterSources &&
        !hasGasSources)
    ) {
      return view;
    }

    if (hasPowerSources) {
      badges.push({
        type: "power-total",
        collection_key: collectionKey,
      });

      chartsSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
        type: "power-sources-graph",
        collection_key: collectionKey,
        grid_options: {
          columns: 36,
        },
      });
    }

    if (hasGasSources) {
      badges.push({
        type: "gas-total",
        collection_key: collectionKey,
      });
    }

    if (hasWaterSources) {
      badges.push({
        type: "water-total",
        collection_key: collectionKey,
      });
    }

    if (hasPowerDevices) {
      const showFloorsAndAreas = shouldShowFloorsAndAreas(
        prefs.device_consumption,
        hass,
        (d) => d.stat_rate
      );
      chartsSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sankey_title"),
        type: "power-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsAndAreas,
        group_by_area: showFloorsAndAreas,
        grid_options: {
          columns: 36,
        },
      });
    }

    if (hasWaterDevices) {
      const showFloorsAndAreas = shouldShowFloorsAndAreas(
        prefs.device_consumption_water,
        hass,
        (d) => d.stat_rate
      );
      chartsSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.water_flow_sankey_title"),
        type: "water-flow-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsAndAreas,
        group_by_area: showFloorsAndAreas,
        grid_options: {
          columns: 36,
        },
      });
    }

    if (badges.length) {
      view.badges = badges;
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-view-strategy": PowerViewStrategy;
  }
}
