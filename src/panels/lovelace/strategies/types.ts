import { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { LovelaceConfig } from "../../../data/lovelace/config/types";
import { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../types";
import { LovelaceGenericElementEditor } from "../types";

export type LovelaceStrategy<T = any> = {
  generate(config: LovelaceStrategyConfig, hass: HomeAssistant): Promise<T>;
  getConfigElement?: () => LovelaceStrategyEditor;
  noEditor?: boolean;
};

export interface LovelaceDashboardStrategy
  extends LovelaceStrategy<LovelaceConfig> {}

export interface LovelaceViewStrategy
  extends LovelaceStrategy<LovelaceViewConfig> {}

export interface LovelaceSectionStrategy
  extends LovelaceStrategy<LovelaceSectionConfig> {}

export interface LovelaceStrategyEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceStrategyConfig): void;
}
