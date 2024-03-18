import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { HomeAssistant } from "../../../../types";
import { MapViewStrategyConfig } from "./map-view-strategy";

export type MapDashboardStrategyConfig = MapViewStrategyConfig;

@customElement("map-dashboard-strategy")
export class MapDashboardStrategy extends ReactiveElement {
  static async generate(
    config: MapDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    return {
      title: hass.localize("panel.map"),
      views: [
        {
          strategy: config,
        },
      ],
    };
  }

  static noEditor = true;
}

declare global {
  interface HTMLElementTagNameMap {
    "map-dashboard-strategy": MapDashboardStrategy;
  }
}
