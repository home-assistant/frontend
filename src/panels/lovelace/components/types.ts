import { LovelaceCardConfig } from "../../../data/lovelace";
import { Condition } from "../common/validate-condition";
import { LovelaceElementConfig } from "../elements/types";

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
