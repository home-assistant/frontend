import { LovelaceDashboardConfig } from "../../../data/lovelace/config/dashboard";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../types";

export type LovelaceStrategy<T = any> = {
  generate(config: LovelaceStrategyConfig, hass: HomeAssistant): Promise<T>;
};

export interface LovelaceDashboardStrategy
  extends LovelaceStrategy<LovelaceDashboardConfig> {}

export interface LovelaceViewStrategy
  extends LovelaceStrategy<LovelaceViewConfig> {}
