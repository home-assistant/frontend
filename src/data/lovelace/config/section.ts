import type { Condition } from "../../../panels/lovelace/common/validate-condition";
import type { LovelaceCardConfig } from "./card";
import type { LovelaceStrategyConfig } from "./strategy";

export const DEFAULT_SECTION_BACKGROUND_OPACITY = 50;

export interface LovelaceSectionBackgroundConfig {
  color?: string;
  opacity?: number;
}

export interface LovelaceBaseSectionConfig {
  visibility?: Condition[];
  disabled?: boolean;
  column_span?: number;
  row_span?: number;
  background?: boolean | LovelaceSectionBackgroundConfig;
  /**
   * @deprecated Use heading card instead.
   */
  title?: string;
  theme?: string;
}

export interface LovelaceSectionConfig extends LovelaceBaseSectionConfig {
  type?: string;
  cards?: LovelaceCardConfig[];
}

export interface LovelaceStrategySectionConfig extends LovelaceBaseSectionConfig {
  strategy: LovelaceStrategyConfig;
}

export type LovelaceSectionRawConfig =
  | LovelaceSectionConfig
  | LovelaceStrategySectionConfig;

export function resolveSectionBackground(
  background: boolean | LovelaceSectionBackgroundConfig | undefined
): LovelaceSectionBackgroundConfig | undefined {
  if (typeof background === "boolean") {
    return background ? {} : undefined;
  }
  return background;
}

export function isStrategySection(
  section: LovelaceSectionRawConfig
): section is LovelaceStrategySectionConfig {
  return "strategy" in section;
}
