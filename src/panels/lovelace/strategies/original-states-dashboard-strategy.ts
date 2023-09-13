import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { LovelaceConfig } from "../../../data/lovelace/config/types";
import { HomeAssistant } from "../../../types";
import { LovelaceStrategyEditor } from "./types";

export type OriginalStatesDashboardStrategyConfig = LovelaceStrategyConfig & {
  no_area_group?: boolean;
};

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    config: OriginalStatesDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    return {
      title: hass.config.location_name,
      views: [
        {
          strategy: {
            type: "original-states",
            no_area_group: config.no_area_group,
          },
        },
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import(
      "../editor/dashboard-strategy-editor/hui-original-states-dashboard-strategy-editor"
    );
    return document.createElement(
      "hui-original-states-dashboard-strategy-editor"
    );
  }
}
