import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import { getEnergyPreferences } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";

const setupWizard = async (): Promise<LovelaceViewConfig> => {
  await import("../cards/energy-setup-wizard-card");
  return {
    type: "panel",
    cards: [
      {
        type: "custom:energy-setup-wizard-card",
      },
    ],
  };
};

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view: LovelaceViewConfig = { cards: [] };

    let prefs: EnergyPreferences;

    try {
      prefs = await getEnergyPreferences(hass);
    } catch (err: any) {
      if (err.code === "not_found") {
        return setupWizard();
      }
      view.cards!.push({
        type: "markdown",
        content: `An error occurred while fetching your energy preferences: ${err.message}.`,
      });
      return view;
    }

    // No energy sources available, start from scratch
    if (
      prefs!.device_consumption.length === 0 &&
      prefs!.energy_sources.length === 0
    ) {
      return setupWizard();
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
    const hasGas = prefs.energy_sources.some((source) => source.type === "gas");
    const hasBattery = prefs.energy_sources.some(
      (source) => source.type === "battery"
    );
    const hasWater = prefs.energy_sources.some(
      (source) => source.type === "water"
    );

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

    // Only include if we have a gas source.
    if (hasGas) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_gas_graph_title"),
        type: "energy-gas-graph",
        collection_key: "energy_dashboard",
      });
    }

    // Only include if we have a water source.
    if (hasWater) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_water_graph_title"),
        type: "energy-water-graph",
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

    if (hasGrid || hasSolar || hasGas || hasWater || hasBattery) {
      view.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: "energy_dashboard",
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
      const showFloorsNAreas = !prefs.device_consumption.some(
        (d) => d.included_in_stat
      );
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
