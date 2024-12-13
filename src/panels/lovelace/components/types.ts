import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { Condition } from "../common/validate-condition";
import type { LovelaceElementConfig } from "../elements/types";

export interface ConditionalBaseConfig extends LovelaceCardConfig {
  card: LovelaceCardConfig | LovelaceElementConfig;
  conditions: Condition[];
}

export const TIMESTAMP_RENDERING_FORMATS = [
  "relative",
  "total",
  "date",
  "time",
  "datetime",
] as const;

export type TimestampRenderingFormat =
  (typeof TIMESTAMP_RENDERING_FORMATS)[number];
