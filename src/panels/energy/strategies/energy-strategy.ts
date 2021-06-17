import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { LovelaceViewStrategy } from "../../lovelace/strategies/get-strategy";

export class EnergyStrategy {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;

    if (hass.config.state === STATE_NOT_RUNNING) {
      return {
        cards: [{ type: "starting" }],
      };
    }

    const view = { cards: [] };

    // User has no entities
    if (view.cards!.length === 0) {
      view.cards!.push({
        type: "empty-state",
      });
    }

    return view;
  }
}
