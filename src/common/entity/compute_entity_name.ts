import type { HassEntity } from "home-assistant-js-websocket";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { computeDeviceName } from "./compute_device_name";
import { computeStateName } from "./compute_state_name";
import { stripPrefixFromEntityName } from "./strip_prefix_from_entity_name";

export const computeEntityName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  if (!entry) {
    // Fall back to state name if not in the entity registry (friendly name)
    return computeStateName(stateObj);
  }
  return computeEntityEntryName(entry, devices);
};

export const computeEntityEntryName = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  devices: HomeAssistant["devices"],
  fallbackStateObj?: HassEntity
): string | undefined => {
  const name =
    entry.name ||
    ("original_name" in entry && entry.original_name != null
      ? String(entry.original_name)
      : undefined);

  const device = entry.device_id ? devices[entry.device_id] : undefined;

  if (!device) {
    if (name) {
      return name;
    }
    if (fallbackStateObj) {
      return computeStateName(fallbackStateObj);
    }
    return undefined;
  }

  const deviceName = computeDeviceName(device);

  // If the device name is the same as the entity name, consider empty entity name
  if (deviceName === name) {
    return undefined;
  }

  // Remove the device name from the entity name if it starts with it
  if (deviceName && name) {
    return stripPrefixFromEntityName(name, deviceName) || name;
  }

  return name;
};

export const entityUseDeviceName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): boolean => !computeEntityName(stateObj, entities, devices);
