import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceDashboardSuggestions } from "../../../../data/lovelace/dashboard";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { MapViewStrategyConfig } from "./map-view-strategy";

export type MapDashboardStrategyConfig = MapViewStrategyConfig;

@customElement("map-dashboard-strategy")
export class MapDashboardStrategy extends ReactiveElement {
  static async generate(
    config: MapDashboardStrategyConfig
  ): Promise<LovelaceConfig> {
    return {
      views: [
        {
          strategy: config,
        },
      ],
    };
  }

  static noEditor = true;

  static getCreateSuggestions(
    hass: HomeAssistant
  ): LovelaceDashboardSuggestions {
    return {
      title: hass.localize("panel.map"),
      icon: "mdi:map",
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "map-dashboard-strategy": MapDashboardStrategy;
  }
}
