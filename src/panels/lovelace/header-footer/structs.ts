import {
  array,
  dynamic,
  number,
  object,
  optional,
  union,
  string,
} from "superstruct";
import { actionConfigStruct } from "../editor/structs/action-struct";
import { buttonEntityConfigStruct } from "../editor/structs/button-entity-struct";
import { LovelaceHeaderFooterConfig } from "./types";

export const pictureHeaderFooterConfigStruct = object({
  type: string(),
  image: string(),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
  alt_text: optional(string()),
});

export const buttonsHeaderFooterConfigStruct = object({
  type: string(),
  entities: array(buttonEntityConfigStruct),
});

export const graphHeaderFooterConfigStruct = object({
  type: string(),
  entity: string(),
  detail: optional(number()),
  hours_to_show: optional(number()),
});

export const headerFooterConfigStructs = dynamic<any>((value) => {
  if (value && typeof value === "object" && "type" in value) {
    switch ((value as LovelaceHeaderFooterConfig).type!) {
      case "buttons": {
        return buttonsHeaderFooterConfigStruct;
      }
      case "graph": {
        return graphHeaderFooterConfigStruct;
      }
      case "picture": {
        return pictureHeaderFooterConfigStruct;
      }
    }
  }

  // No "type" property => we fallback to a union of all potential types
  return union([
    buttonsHeaderFooterConfigStruct,
    graphHeaderFooterConfigStruct,
    pictureHeaderFooterConfigStruct,
  ]);
});
