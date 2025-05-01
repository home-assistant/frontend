import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { MapCardConfig } from "../../cards/types";

export interface MapViewStrategyConfig {
  type: "map";
}

@customElement("map-view-strategy")
export class MapViewStrategy extends ReactiveElement {
  static async generate(
    _config: MapViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    return {
      type: "panel",
      title: hass.localize("panel.map"),
      icon: "mdi:map",
      cards: [
        {
          type: "map",
          auto_fit: true,
          show_all: true,
        } as MapCardConfig,
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "map-view-strategy": MapViewStrategy;
  }
}
