import { LovelaceConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export type LovelaceStrategyConfigType = "dashboard" | "view";

export type LovelaceStrategyConfig<T = Record<string, any>> = {
  type: string;
  options?: T;
};

export type LovelaceStrategyParams = {
  narrow?: boolean;
};

export type LovelaceStrategy<T = any> = {
  generate(
    config: LovelaceStrategyConfig,
    hass: HomeAssistant,
    params?: LovelaceStrategyParams
  ): Promise<T>;
};

export interface LovelaceDashboardStrategy
  extends LovelaceStrategy<LovelaceConfig> {}

export interface LovelaceViewStrategy
  extends LovelaceStrategy<LovelaceViewConfig> {}
