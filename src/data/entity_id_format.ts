import type { HomeAssistantApi } from "../types";

export type EntityIdPart = "area" | "device" | "entity" | "floor";

export type EntityIdFormat = EntityIdPart[];

export const DEFAULT_ENTITY_ID_FORMAT: EntityIdFormat = [
  "area",
  "device",
  "entity",
];

export const isDefaultEntityIdFormat = (format: EntityIdFormat): boolean =>
  JSON.stringify(format) === JSON.stringify(DEFAULT_ENTITY_ID_FORMAT);

export interface EntityRegistrySettings {
  entity_id_parts: EntityIdFormat | null;
}

export const fetchEntityRegistrySettings = (
  api: HomeAssistantApi
): Promise<EntityRegistrySettings> =>
  api.callWS<EntityRegistrySettings>({
    type: "config/entity_registry/settings/get",
  });

export const updateEntityRegistrySettings = (
  api: HomeAssistantApi,
  updates: Partial<EntityRegistrySettings>
): Promise<EntityRegistrySettings> =>
  api.callWS<EntityRegistrySettings>({
    type: "config/entity_registry/settings/update",
    ...updates,
  });
