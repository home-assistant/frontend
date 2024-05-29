import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { MapViewStrategyConfig } from "./map-view-strategy";

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
}

declare global {
  interface HTMLElementTagNameMap {
    "map-dashboard-strategy": MapDashboardStrategy;
  }
}
