import type { EntityNameType } from "../common/entity/compute_entity_name_display";

export type EntityIdPart = EntityNameType;

export type EntityIdFormat = EntityIdPart[];

export const DEFAULT_ENTITY_ID_FORMAT: EntityIdFormat = [
  "area",
  "parent_device",
  "device",
  "entity",
];

export const isDefaultEntityIdFormat = (format: EntityIdFormat): boolean =>
  JSON.stringify(format) === JSON.stringify(DEFAULT_ENTITY_ID_FORMAT);
