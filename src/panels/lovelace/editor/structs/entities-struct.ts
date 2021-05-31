import { union, object, string, optional, boolean } from "superstruct";
import { actionConfigStruct } from "./action-struct";

export const entitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(string()),
    icon: optional(string()),
    image: optional(string()),
    secondary_info: optional(string()),
    format: optional(string()),
    state_color: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  }),
  string(),
]);
