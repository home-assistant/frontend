import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { LovelaceDashboardConfig } from "../../../data/lovelace/config/dashboard";

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceDashboardConfig> {
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
