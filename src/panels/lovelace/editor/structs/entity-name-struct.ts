import { array, literal, object, string, union } from "superstruct";

const entityNameItemStruct = union([
  object({
    type: literal("text"),
    text: string(),
  }),
  object({
    type: union([
      literal("entity"),
      literal("device"),
      literal("area"),
      literal("floor"),
    ]),
  }),
  string(),
]);

export const entityNameStruct = union([
  entityNameItemStruct,
  array(entityNameItemStruct),
]);
