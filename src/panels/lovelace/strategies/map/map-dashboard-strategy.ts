import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { HomeAssistant } from "../../../../types";
import { LovelaceStrategyEditor } from "../types";
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

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import(
      "../../editor/dashboard-strategy-editor/hui-map-dashboard-strategy-editor"
    );
    return document.createElement("hui-map-dashboard-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "map-dashboard-strategy": MapDashboardStrategy;
  }
}
