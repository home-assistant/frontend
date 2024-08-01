import type { Condition } from "../../../panels/lovelace/common/validate-condition";
import type { LovelaceCardConfig } from "./card";
import type { LovelaceStrategyConfig } from "./strategy";

export interface LovelaceBaseSectionConfig {
  columns?: number;
  title?: string;
  visibility?: Condition[];
}

export interface LovelaceSectionConfig extends LovelaceBaseSectionConfig {
  type?: string;
  cards?: LovelaceCardConfig[];
}

export interface LovelaceStrategySectionConfig
  extends LovelaceBaseSectionConfig {
  strategy: LovelaceStrategyConfig;
}

export type LovelaceSectionRawConfig =
  | LovelaceSectionConfig
  | LovelaceStrategySectionConfig;

export function isStrategySection(
  section: LovelaceSectionRawConfig
): section is LovelaceStrategySectionConfig {
  return "strategy" in section;
}
