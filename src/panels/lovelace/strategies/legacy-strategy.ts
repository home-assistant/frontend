import {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../data/lovelace/config/types";
import {
  LovelaceViewConfig,
  LovelaceViewRawConfig,
} from "../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../types";

export const isLegacyStrategy = (
  strategy: any
): strategy is LovelaceDashboardStrategy | LovelaceViewStrategy =>
  !("generate" in strategy);

export interface LovelaceDashboardStrategy {
  generateDashboard(info: {
    config?: LovelaceRawConfig;
    hass: HomeAssistant;
  }): Promise<LovelaceConfig>;
}

export interface LovelaceViewStrategy {
  generateView(info: {
    view: LovelaceViewRawConfig;
    config: LovelaceConfig;
    hass: HomeAssistant;
  }): Promise<LovelaceViewConfig>;
}
