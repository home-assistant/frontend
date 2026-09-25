import { array, union, object, string, optional, boolean } from "superstruct";
import { timeFormatConfigStruct } from "../../components/types";
import {
  actionConfigStruct,
  actionConfigStructConfirmation,
} from "./action-struct";
import { entityNameStruct } from "./entity-name-struct";

export const entitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(entityNameStruct),
    icon: optional(string()),
    image: optional(string()),
    secondary_info: optional(union([string(), array(string())])),
    time_format: optional(timeFormatConfigStruct),
    color: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    confirmation: optional(actionConfigStructConfirmation),
    show_last_changed: optional(boolean()),
    show_state: optional(boolean()),
  }),
  string(),
]);

export const graphEntitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(entityNameStruct),
    color: optional(string()),
  }),
  string(),
]);
