import {
  LovelaceDashboardConfig,
  LovelaceDashboardRawConfig,
} from "../../../data/lovelace/config/dashboard";
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
    config?: LovelaceDashboardRawConfig;
    hass: HomeAssistant;
  }): Promise<LovelaceDashboardConfig>;
}

export interface LovelaceViewStrategy {
  generateView(info: {
    view: LovelaceViewRawConfig;
    config: LovelaceDashboardConfig;
    hass: HomeAssistant;
  }): Promise<LovelaceViewConfig>;
}
