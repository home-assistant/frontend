import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { GridSourceTypeEnergyPreference } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";

@customElement("energy-overview-view-strategy")
export class EnergyOverviewViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [],
      dense_section_placement: true,
      max_columns: 2,
    };

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

    const hasGrid = prefs.energy_sources.find(
      (source) =>
        source.type === "grid" &&
        (source.flow_from?.length || source.flow_to?.length)
    ) as GridSourceTypeEnergyPreference;
    const hasGas = prefs.energy_sources.some((source) => source.type === "gas");
    const hasBattery = prefs.energy_sources.some(
      (source) => source.type === "battery"
    );
    const hasSolar = prefs.energy_sources.some(
      (source) => source.type === "solar"
    );
    const hasWaterSources = prefs.energy_sources.some(
      (source) => source.type === "water"
    );
    const hasWaterDevices = prefs.device_consumption_water?.length;
    const hasPowerSources = prefs.energy_sources.find(
      (source) =>
        (source.type === "solar" && source.stat_rate) ||
        (source.type === "battery" && source.stat_rate) ||
        (source.type === "grid" && source.power?.length)
    );

    if (hasGrid || hasBattery || hasSolar) {
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

    if (prefs.energy_sources.length) {
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

    if (hasPowerSources) {
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

    if (hasGrid || hasBattery) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            title: hass.localize(
              "ui.panel.energy.cards.energy_usage_graph_title"
            ),
            type: "energy-usage-graph",
            collection_key: "energy_dashboard",
          },
        ],
      });
    }

    if (hasGas) {
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

    if (hasWaterSources || hasWaterDevices) {
      view.sections!.push({
        type: "grid",
        cards: [
          hasWaterSources
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
