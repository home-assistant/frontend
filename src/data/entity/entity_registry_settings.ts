import type { HomeAssistantApi } from "../../types";
import type { EntityIdFormat } from "../entity_id_format";

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
