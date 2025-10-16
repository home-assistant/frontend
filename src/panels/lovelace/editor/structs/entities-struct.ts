import { union, object, string, optional, boolean, enums } from "superstruct";
import { TIMESTAMP_RENDERING_FORMATS } from "../../components/types";
import {
  actionConfigStruct,
  actionConfigStructConfirmation,
} from "./action-struct";

export const entitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(string()),
    icon: optional(string()),
    image: optional(string()),
    secondary_info: optional(string()),
    format: optional(enums(TIMESTAMP_RENDERING_FORMATS)),
    state_color: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    confirmation: optional(actionConfigStructConfirmation),
    show_last_changed: optional(boolean()),
    show_state: optional(boolean()),
  }),
  string(),
]);
