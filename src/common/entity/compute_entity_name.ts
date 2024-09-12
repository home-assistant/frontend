import { HassEntity } from "home-assistant-js-websocket";
import { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { HomeAssistant } from "../../types";
import { stripPrefixFromEntityName } from "./strip_prefix_from_entity_name";
import { computeStateName } from "./compute_state_name";
import { computeDeviceName } from "./compute_device_name";
import { computeAreaName } from "./compute_area_name";

export const computeEntityName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as EntityRegistryDisplayEntry;

  const device = entry?.device_id ? devices[entry.device_id] : undefined;
  const name = entry?.has_entity_name
    ? entry.name?.trim()
    : computeStateName(stateObj).trim();

  if (!name) {
    return undefined;
  }

  const deviceName = device ? computeDeviceName(device) : undefined;
  if (!deviceName) {
    return name;
  }

  // if the device name equals the entity name, consider empty entity name
  if (deviceName === name) {
    return undefined;
  }
  return stripPrefixFromEntityName(name, deviceName.toLowerCase()) || name;
};

export const computeEntityDeviceName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  const device = entry?.device_id ? devices[entry.device_id] : undefined;

  return device ? computeDeviceName(device) : undefined;
};

export const computeEntityAreaName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  const device = entry?.device_id ? devices[entry?.device_id] : undefined;

  const areaId = entry?.area_id || device?.area_id;
  const area = areaId ? areas[areaId] : undefined;

  return area ? computeAreaName(area) : undefined;
};
