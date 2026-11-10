import { array, enums, literal, object, string, union } from "superstruct";
import { ENTITY_NAME_TYPES } from "../../../../common/entity/compute_entity_name_display";

const entityNameItemStruct = union([
  object({
    type: literal("text"),
    text: string(),
  }),
  object({
    type: enums(ENTITY_NAME_TYPES),
  }),
  string(),
]);

export const entityNameStruct = union([
  entityNameItemStruct,
  array(entityNameItemStruct),
]);
