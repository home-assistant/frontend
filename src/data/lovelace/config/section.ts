import type { Condition } from "../../../panels/lovelace/common/validate-condition";
import type { LovelaceCardConfig } from "./card";
import type { LovelaceStrategyConfig } from "./strategy";

export interface LovelaceBaseSectionConfig {
  visibility?: Condition[];
  hidden?: boolean;
  column_span?: number;
  row_span?: number;
  /**
   * @deprecated Use heading card instead.
   */
  title?: string;
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
