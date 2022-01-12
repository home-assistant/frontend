import { object, string, optional, array, number, union } from "superstruct";
import { actionConfigStruct } from "../editor/structs/action-struct";
import { entitiesConfigStruct } from "../editor/structs/entities-struct";

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
