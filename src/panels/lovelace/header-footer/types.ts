import { ActionConfig } from "../../../data/lovelace";
import { struct } from "../common/structs/struct";
import { actionConfigStruct, entitiesConfigStruct } from "../editor/types";

export interface LovelaceHeaderFooterConfig {
  type: string;
}

export interface ButtonsHeaderFooterConfig extends LovelaceHeaderFooterConfig {
  entities: string[];
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

export const headerFooterConfigStructs = struct.union([
  pictureHeaderFooterConfigStruct,
  buttonsHeaderFooterConfigStruct,
]);
