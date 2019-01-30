import { HomeAssistant } from "../types";
import computeStateName from "../common/entity/compute_state_name";

export interface EntityRegistryEntry {
  entity_id: string;
  name: string;
  platform: string;
  config_entry_id?: string;
  device_id?: string;
  disabled_by?: string;
}

export interface EntityRegistryEntryUpdateParams {
  name: string;
  new_entity_id: string;
}

export const computeEntityRegistryName = (
  hass: HomeAssistant,
  entry: EntityRegistryEntry
) => {
  if (entry.name) {
    return entry.name;
  }
  const state = hass.states[entry.entity_id];
  return state ? computeStateName(state) : null;
};

export const fetchEntityRegistry = (hass: HomeAssistant) =>
  hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" });

export const updateEntityRegistryEntry = (
  hass: HomeAssistant,
  entityId: string,
  updates: Partial<EntityRegistryEntryUpdateParams>
) =>
  hass.callWS<EntityRegistryEntry>({
    type: "config/entity_registry/update",
    entity_id: entityId,
    ...updates,
  });

export const removeEntityRegistryEntry = (
  hass: HomeAssistant,
  entityId: string
) =>
  hass.callWS({
    type: "config/entity_registry/remove",
    entity_id: entityId,
  });
