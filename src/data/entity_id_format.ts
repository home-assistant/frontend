export type EntityIdPart =
  "area" | "parent_device" | "device" | "entity" | "floor";

export type EntityIdFormat = EntityIdPart[];

export const DEFAULT_ENTITY_ID_FORMAT: EntityIdFormat = [
  "area",
  "parent_device",
  "device",
  "entity",
];

export const isDefaultEntityIdFormat = (format: EntityIdFormat): boolean =>
  JSON.stringify(format) === JSON.stringify(DEFAULT_ENTITY_ID_FORMAT);
