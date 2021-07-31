import {
  EnergyPreferences,
  getEnergyDataCollection,
  getEnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import { LovelaceViewConfig } from "../../../data/lovelace";
import { LovelaceViewStrategy } from "../../lovelace/strategies/get-strategy";

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

export class EnergyStrategy {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;

    const view: LovelaceViewConfig = { cards: [] };

    let prefs: EnergyPreferences;

    try {
      prefs = await getEnergyPreferences(hass);
    } catch (e) {
      if (e.code === "not_found") {
        return setupWizard();
      }
      view.cards!.push({
        type: "markdown",
        content: `An error occured while fetching your energy preferences: ${e.message}.`,
      });
      return view;
    }

    view.type = "sidebar";

    const hasGrid = prefs.energy_sources.find(
      (source) => source.type === "grid"
    ) as GridSourceTypeEnergyPreference;
    const hasReturn = hasGrid && hasGrid.flow_to.length;
    const hasSolar = prefs.energy_sources.some(
      (source) => source.type === "solar"
    );

    const energyCollection = getEnergyDataCollection(hass, prefs);

    // Only include if we have a grid source.
    if (hasGrid) {
      view.cards!.push({
        title: "Energy usage",
        type: "energy-usage-graph",
        energyCollection,
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      view.cards!.push({
        title: "Solar production",
        type: "energy-solar-graph",
        energyCollection,
      });
    }

    // Only include if we have a grid.
    if (hasGrid) {
      view.cards!.push({
        title: "Energy distribution",
        type: "energy-distribution",
        energyCollection,
        view_layout: { position: "sidebar" },
      });
    }

    if (hasGrid || hasSolar) {
      view.cards!.push({
        title: "Sources",
        type: "energy-sources-table",
        energyCollection,
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      view.cards!.push({
        type: "energy-solar-consumed-gauge",
        energyCollection,
        view_layout: { position: "sidebar" },
      });
    }

    // Only include if we have a grid source & return.
    if (hasReturn) {
      view.cards!.push({
        type: "energy-grid-neutrality-gauge",
        energyCollection,
        view_layout: { position: "sidebar" },
      });
    }

    // Only include if we have a grid
    if (hasGrid) {
      view.cards!.push({
        type: "energy-carbon-consumed-gauge",
        energyCollection,
        view_layout: { position: "sidebar" },
      });
    }

    // Only include if we have at least 1 device in the config.
    if (prefs.device_consumption.length) {
      view.cards!.push({
        title: "Monitor individual devices",
        type: "energy-devices-graph",
        energyCollection,
      });
    }

    return view;
  }
}
