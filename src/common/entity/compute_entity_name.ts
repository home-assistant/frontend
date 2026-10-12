import type { HassEntity } from "home-assistant-js-websocket";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";
import { computeStateName } from "./compute_state_name";

export const computeEntityName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    EntityRegistryDisplayEntry | undefined;

  if (!entry) {
    // Fall back to state name if not in the entity registry (friendly name)
    return computeStateName(stateObj);
  }
  return computeEntityEntryName(entry);
};

export const computeEntityEntryName = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  fallbackStateObj?: HassEntity
): string | undefined => {
  const name =
    entry.name ??
    ("original_name" in entry && entry.original_name != null
      ? String(entry.original_name)
      : undefined);

  if (name) {
    return name;
  }
  if (!entry.device_id && fallbackStateObj) {
    return computeStateName(fallbackStateObj);
  }
  return undefined;
};

export const entityUseDeviceName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"]
): boolean => !computeEntityName(stateObj, entities);
