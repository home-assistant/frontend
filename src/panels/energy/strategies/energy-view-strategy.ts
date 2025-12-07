import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { GridSourceTypeEnergyPreference } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
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

    view.type = "sidebar";

    const hasGrid = prefs.energy_sources.find(
      (source) =>
        source.type === "grid" &&
        (source.flow_from?.length || source.flow_to?.length)
    ) as GridSourceTypeEnergyPreference;
    const hasReturn = hasGrid && hasGrid.flow_to.length;
    const hasSolar = prefs.energy_sources.some(
      (source) => source.type === "solar"
    );
    const hasBattery = prefs.energy_sources.some(
      (source) => source.type === "battery"
    );
    const showFloorsNAreas = !prefs.device_consumption.some(
      (d) => d.included_in_stat
    );

    view.cards!.push({
      type: "energy-date-selection",
      collection_key: collectionKey,
    });
    view.cards!.push({
      type: "energy-compare",
      collection_key: "energy_dashboard",
    });

    // Only include if we have a grid or battery.
    if (hasGrid || hasBattery) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
        type: "energy-usage-graph",
        collection_key: "energy_dashboard",
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
        type: "energy-solar-graph",
        collection_key: "energy_dashboard",
      });
    }

    // Only include if we have a grid or battery.
    if (hasGrid || hasBattery) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
        type: "energy-distribution",
        view_layout: { position: "sidebar" },
        collection_key: "energy_dashboard",
      });
    }

    if (hasGrid || hasSolar || hasBattery) {
      view.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: "energy_dashboard",
        types: ["grid", "solar", "battery"],
      });
    }

    // Only include if we have a grid source & return.
    if (hasReturn) {
      view.cards!.push({
        type: "energy-grid-neutrality-gauge",
        view_layout: { position: "sidebar" },
        collection_key: "energy_dashboard",
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      if (hasReturn) {
        view.cards!.push({
          type: "energy-solar-consumed-gauge",
          view_layout: { position: "sidebar" },
          collection_key: "energy_dashboard",
        });
      }
      if (hasGrid) {
        view.cards!.push({
          type: "energy-self-sufficiency-gauge",
          view_layout: { position: "sidebar" },
          collection_key: "energy_dashboard",
        });
      }
    }

    // Only include if we have a grid
    if (hasGrid) {
      view.cards!.push({
        type: "energy-carbon-consumed-gauge",
        view_layout: { position: "sidebar" },
        collection_key: "energy_dashboard",
      });
    }

    // Only include if we have at least 1 device in the config.
    if (prefs.device_consumption.length) {
      view.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_detail_graph_title"
        ),
        type: "energy-devices-detail-graph",
        collection_key: "energy_dashboard",
      });
      view.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_graph_title"
        ),
        type: "energy-devices-graph",
        collection_key: "energy_dashboard",
      });
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_sankey_title"),
        type: "energy-sankey",
        collection_key: "energy_dashboard",
        group_by_floor: showFloorsNAreas,
        group_by_area: showFloorsNAreas,
      });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-view-strategy": EnergyViewStrategy;
  }
}
