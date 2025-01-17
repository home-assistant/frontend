import type { HassEntity } from "home-assistant-js-websocket";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
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

  const device = entry?.device_id ? hass.devices[entry.device_id] : undefined;

  const name = entry ? entry.name : computeStateName(stateObj);

  const deviceName = device ? computeDeviceName(device) : undefined;

  if (!name || !deviceName || name === deviceName) {
    return name || deviceName;
  }

  return stripPrefixFromEntityName(name, deviceName) || name;
};
