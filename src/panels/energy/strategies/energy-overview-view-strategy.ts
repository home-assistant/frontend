import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { GridSourceTypeEnergyPreference } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";

const sourceHasCost = (source: Record<string, any>): boolean =>
  Boolean(
    source.stat_cost ||
    source.stat_compensation ||
    source.entity_energy_price ||
    source.number_energy_price
  );

@customElement("energy-overview-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
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
    const hasPowerDevices = prefs.device_consumption.find(
      (device) => device.stat_rate
    );
    const hasCost = prefs.energy_sources.some(
      (source) =>
        sourceHasCost(source) ||
        (source.type === "grid" &&
          (source.flow_from?.some(sourceHasCost) ||
            source.flow_to?.some(sourceHasCost)))
    );

    const overviewSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: 24,
      cards: [],
    };
    // Only include if we have a grid or battery.
    if (hasGrid || hasBattery) {
      overviewSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
        type: "energy-distribution",
        collection_key: collectionKey,
      });
    }
    if (hasCost) {
      overviewSection.cards!.push({
        type: "energy-sources-table",
        collection_key: collectionKey,
        show_only_totals: true,
      });
    }
    view.sections!.push(overviewSection);

    const powerSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: hass.localize("ui.panel.energy.title.power"),
          tap_action: {
            action: "navigate",
            navigation_path: "/energy/power",
          },
        },
      ],
    };
    if (hasPowerDevices) {
      const showFloorsNAreas = !prefs.device_consumption.some(
        (d) => d.included_in_stat
      );
      powerSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sankey_title"),
        type: "power-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsNAreas,
        group_by_area: showFloorsNAreas,
        grid_options: {
          columns: 24,
        },
      });
      powerSection.column_span = 24;
      view.sections!.push(powerSection);
    } else if (hasPowerSources) {
      powerSection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.power_sources_graph_title"),
        type: "power-sources-graph",
        collection_key: collectionKey,
      });
      view.sections!.push(powerSection);
    }

    const energySection: LovelaceSectionConfig = {
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: hass.localize("ui.panel.energy.title.energy"),
          tap_action: {
            action: "navigate",
            navigation_path: "/energy/electricity",
          },
        },
      ],
    };
    view.sections!.push(energySection);
    if (hasGrid || hasBattery) {
      energySection.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
        type: "energy-usage-graph",
        collection_key: "energy_dashboard",
      });
    }
    if (prefs!.device_consumption.length > 3) {
      energySection.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_top_consumers_title"
        ),
        type: "energy-devices-graph",
        collection_key: collectionKey,
        max_devices: 3,
        modes: ["bar"],
      });
    }

    if (hasGas) {
      view.sections!.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: hass.localize("ui.panel.energy.title.gas"),
          },
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
          {
            type: "heading",
            heading: hass.localize("ui.panel.energy.title.water"),
            tap_action: {
              action: "navigate",
              navigation_path: "/energy/water",
            },
          },
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
    "energy-overview-view-strategy": EnergyViewStrategy;
  }
}
