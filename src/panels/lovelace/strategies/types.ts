import { LovelaceConfig } from "../../../data/lovelace/config/types";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../types";

export type LovelaceStrategy<T = any> = {
  generate(config: LovelaceStrategyConfig, hass: HomeAssistant): Promise<T>;
};

export interface LovelaceDashboardStrategy
  extends LovelaceStrategy<LovelaceConfig> {}

export interface LovelaceViewStrategy
  extends LovelaceStrategy<LovelaceViewConfig> {}
