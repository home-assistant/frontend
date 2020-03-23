import { ActionConfig } from "../../../data/lovelace";
import { struct } from "../common/structs/struct";
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

export const pictureHeaderFooterConfigStruct = struct({
  type: "string",
  image: "string",
  tap_action: struct.optional(actionConfigStruct),
  hold_action: struct.optional(actionConfigStruct),
  double_tap_action: struct.optional(actionConfigStruct),
});

export const buttonsHeaderFooterConfigStruct = struct({
  type: "string",
  entities: [entitiesConfigStruct],
});

export const graphHeaderFooterConfigStruct = struct({
  type: "string",
  entity: "string",
  detail: "number?",
  hours_to_show: "number?",
});

export const headerFooterConfigStructs = struct.union([
  pictureHeaderFooterConfigStruct,
  buttonsHeaderFooterConfigStruct,
  graphHeaderFooterConfigStruct,
]);
