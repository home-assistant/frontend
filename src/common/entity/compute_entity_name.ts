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
  hass: HomeAssistant
): string | undefined => {
  const entry = hass.entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  if (!entry) {
    // Fall back to state name if not in the entity registry (friendly name)
    return computeStateName(stateObj);
  }
  return computeEntityEntryName(entry, hass);
};

export const computeEntityEntryName = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  hass: HomeAssistant
): string | undefined => {
  const name =
    entry.name || ("original_name" in entry ? entry.original_name : undefined);

  // Ensure name is a string (original_name might be a number)
  const safeName = typeof name === "string" ? name : undefined;

  const device = entry.device_id ? hass.devices[entry.device_id] : undefined;

  if (!device) {
    if (safeName) {
      return safeName;
    }
    const stateObj = hass.states[entry.entity_id] as HassEntity | undefined;
    if (stateObj) {
      return computeStateName(stateObj);
    }
    return undefined;
  }

  const deviceName = computeDeviceName(device);

  // If the device name is the same as the entity name, consider empty entity name
  if (deviceName === safeName) {
    return undefined;
  }

  // Remove the device name from the entity name if it starts with it
  if (deviceName && safeName) {
    return stripPrefixFromEntityName(safeName, deviceName) || safeName;
  }

  return safeName;
};
