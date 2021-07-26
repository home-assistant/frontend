import { EnergyPreferences, getEnergyPreferences } from "../../../data/energy";
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

    let energyPrefs: EnergyPreferences;

    try {
      energyPrefs = await getEnergyPreferences(hass);
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

    const hasGrid = energyPrefs.energy_sources.some(
      (source) => source.type === "grid"
    );
    const hasSolar = energyPrefs.energy_sources.some(
      (source) => source.type === "solar"
    );

    // Only include if we have a grid source.
    if (hasGrid) {
      view.cards!.push({
        title: "Electricity",
        type: "energy-summary-graph",
        prefs: energyPrefs,
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      view.cards!.push({
        title: "Solar production",
        type: "energy-solar-graph",
        prefs: energyPrefs,
      });
    }

    // Only include if we have a grid.
    if (hasGrid) {
      view.cards!.push({
        title: "Costs",
        type: "energy-costs-table",
        prefs: energyPrefs,
      });
    }

    // Only include if we have at least 1 device in the config.
    if (energyPrefs.device_consumption.length) {
      view.cards!.push({
        title: "Monitor individual devices",
        type: "energy-devices-graph",
        prefs: energyPrefs,
      });
    }

    // Only include if we have a grid.
    if (hasGrid) {
      view.cards!.push({
        type: "energy-usage",
        prefs: energyPrefs,
        view_layout: { position: "sidebar" },
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      view.cards!.push({
        type: "energy-solar-consumed-gauge",
        prefs: energyPrefs,
        view_layout: { position: "sidebar" },
      });
    }

    // Only include if we have a grid
    if (hasGrid) {
      view.cards!.push({
        type: "energy-carbon-consumed-gauge",
        prefs: energyPrefs,
        view_layout: { position: "sidebar" },
      });
    }

    view.cards!.push({
      type: "energy-summary",
      prefs: energyPrefs,
      view_layout: { position: "sidebar" },
    });

    return view;
  }
}
