import { array, number, object, optional, string, union } from "superstruct";
import { ActionConfig } from "../../../data/lovelace";
import { actionConfigStruct, entitiesConfigStruct } from "../editor/types";
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
}

export interface PictureHeaderFooterConfig extends LovelaceHeaderFooterConfig {
  image: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export const pictureHeaderFooterConfigStruct = object({
  type: string(),
  image: string(),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

export const buttonsHeaderFooterConfigStruct = object({
  type: string(),
  entities: array(entitiesConfigStruct),
});

export const graphHeaderFooterConfigStruct = object({
  type: string(),
  entity: string(),
  detail: optional(number()),
  hours_to_show: optional(number()),
});

export const headerFooterConfigStructs = union([
  pictureHeaderFooterConfigStruct,
  buttonsHeaderFooterConfigStruct,
  graphHeaderFooterConfigStruct,
]);
