import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig, LovelaceStrategyConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    return {
      title: hass.config.location_name,
      views: [
        {
          strategy: { type: "original-states" },
        },
      ],
    };
  }
}
