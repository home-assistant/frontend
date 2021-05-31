import { ActionConfig } from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";

export interface LovelaceHeaderFooterConfig {
  type: string;
}

export interface ButtonsHeaderFooterConfig extends LovelaceHeaderFooterConfig {
  entities: Array<string | EntityConfig>;
}

export interface GraphHeaderFooterConfig extends LovelaceHeaderFooterConfig {
  entity: string;
  detail?: number;
  hours_to_show?: number;
  limits?: {
    min?: number;
    max?: number;
  };
}

export interface PictureHeaderFooterConfig extends LovelaceHeaderFooterConfig {
  image: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
