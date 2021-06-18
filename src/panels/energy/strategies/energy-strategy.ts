import { dump } from "js-yaml";
import { EnergyPreferences, getEnergyPreferences } from "../../../data/energy";
import { LovelaceViewConfig } from "../../../data/lovelace";
import { LovelaceViewStrategy } from "../../lovelace/strategies/get-strategy";

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
        await import("../cards/energy-setup-wizard-card");
        view.type = "panel";
        view.cards!.push({
          type: "custom:energy-setup-wizard-card",
        });
        return view;
      }
      view.cards!.push({
        type: "markdown",
        content: `An error occured while fetching your energy preferences: ${e.message}.`,
      });
      return view;
    }

    if (energyPrefs.stat_house_energy_meter) {
      view.cards!.push({
        type: "history-graph",
        title: hass.localize("ui.panel.energy.charts.stat_house_energy_meter"),
        entities: [energyPrefs.stat_house_energy_meter],
      });
    }

    if (energyPrefs.stat_solar_generatation) {
      const entities = [energyPrefs.stat_solar_generatation];
      if (energyPrefs.stat_solar_return_to_grid) {
        entities.push(energyPrefs.stat_solar_return_to_grid);
      }
      view.cards!.push({
        type: "history-graph",
        title: hass.localize("ui.panel.energy.charts.solar"),
        entities,
      });
    }

    if (energyPrefs.stat_solar_predicted_generation) {
      view.cards!.push({
        type: "history-graph",
        title: hass.localize("ui.panel.energy.charts.solar"),
        entities: [energyPrefs.stat_solar_predicted_generation],
      });
    }

    if (energyPrefs.stat_device_consumption.length) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.charts.by_device"),
        type: "history-graph",
        entities: energyPrefs.stat_device_consumption,
      });
    }

    // FOR DEV
    view.cards!.push({
      type: "markdown",
      content: `\`\`\`${dump(energyPrefs)}\`\`\``,
    });

    return view;
  }
}
