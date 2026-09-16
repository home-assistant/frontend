/**
 * Shape of a composed entity name, kept free of runtime dependencies so that
 * modules in the core entry chunk can name an entity without pulling in the
 * registry-aware formatters from `compute_entity_name_display`.
 */

export const ENTITY_NAME_TYPES = [
  "floor",
  "area",
  "parent_device",
  "device",
  "entity",
] as const;

export type EntityNameType = (typeof ENTITY_NAME_TYPES)[number];

export type EntityNameItem =
  | {
      type: EntityNameType;
    }
  | {
      type: "text";
      text: string;
    };

export interface EntityNameOptions {
  separator?: string;
}

export const DEFAULT_ENTITY_NAME = [
  { type: "parent_device" },
  { type: "device" },
  { type: "entity" },
] satisfies EntityNameItem[];
