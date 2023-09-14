import { LovelaceConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export type LovelaceStrategyConfigType = "dashboard" | "view";

export type LovelaceStrategyInfo<T = any> = {
  config: T;
  hass: HomeAssistant;
  narrow: boolean | undefined;
};

export type LovelaceStrategy<T = any> = {
  generate(info: LovelaceStrategyInfo<T>): Promise<T>;
};

export interface LovelaceDashboardStrategy
  extends LovelaceStrategy<LovelaceConfig> {}

export interface LovelaceViewStrategy
  extends LovelaceStrategy<LovelaceViewConfig> {}
