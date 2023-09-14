import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig } from "../../../data/lovelace";
import { LovelaceStrategyInfo } from "./types";

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    info: LovelaceStrategyInfo<LovelaceConfig>
  ): Promise<LovelaceConfig> {
    return {
      title: info.hass.config.location_name,
      views: [
        {
          strategy: { type: "original-states" },
        },
      ],
    };
  }
}
