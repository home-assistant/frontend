import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { OriginalStatesViewStrategyConfig } from "./original-states-view-strategy";
import { LovelaceConfig } from "../../../data/lovelace/config/types";

type OriginalStatesStrategyConfig = OriginalStatesViewStrategyConfig;

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    config: OriginalStatesStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    return {
      title: hass.config.location_name,
      views: [
        {
          strategy: config,
        },
      ],
    };
  }
}
