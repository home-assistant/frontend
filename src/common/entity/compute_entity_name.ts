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
  const name = entry.name || undefined;

  const device = entry?.device_id ? hass.devices[entry.device_id] : undefined;
  const deviceName = device ? computeDeviceName(device) : undefined;

  if (deviceName === name) {
    return undefined;
  }

  if (deviceName && name) {
    return stripPrefixFromEntityName(name, deviceName) || name;
  }

  return name;
};
