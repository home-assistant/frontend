import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { MapViewStrategyConfig } from "./map-view-strategy";

export type MapDashboardStrategyConfig = MapViewStrategyConfig;

@customElement("map-dashboard-strategy")
export class MapDashboardStrategy extends ReactiveElement {
  static shouldRegenerate(
    _config: MapDashboardStrategyConfig,
    _oldHass: HomeAssistant,
    _newHass: HomeAssistant
  ): boolean {
    return false;
  }

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
}

declare global {
  interface HTMLElementTagNameMap {
    "map-dashboard-strategy": MapDashboardStrategy;
  }
}
