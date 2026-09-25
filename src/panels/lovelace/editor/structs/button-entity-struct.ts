import { boolean, object, optional, string } from "superstruct";
import { actionConfigStruct } from "./action-struct";

export const buttonEntityConfigStruct = object({
  entity: string(),
  name: optional(string()),
  icon: optional(string()),
  image: optional(string()),
  show_name: optional(boolean()),
  show_icon: optional(boolean()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});
