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

    view.cards!.push({
      type: "markdown",
      content: dump(energyPrefs),
    });

    return view;
  }
}
