import type { HassEntity } from "home-assistant-js-websocket";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { stripPrefixFromEntityName } from "./strip_prefix_from_entity_name";
import { computeStateName } from "./compute_state_name";
import { computeDeviceName } from "./compute_device_name";
import { computeAreaName } from "./compute_area_name";
import { computeFloorName } from "./compute_floor_name";

export const computeEntityFullName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  const entityName = computeEntityName(stateObj, entities, devices);

  if (!entry?.has_entity_name) {
    return entityName;
  }

  const deviceName = computeEntityDeviceName(stateObj, entities, devices);

  if (!entityName || !deviceName || entityName === deviceName) {
    return entityName || deviceName;
  }

  return `${deviceName} ${entityName}`;
};

export const computeEntityName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  const device = entry?.device_id ? devices[entry.device_id] : undefined;

  const name = entry ? entry.name : computeStateName(stateObj);

  const deviceName = device ? computeDeviceName(device) : undefined;

  if (!name || !deviceName || name === deviceName) {
    return name || deviceName;
  }

  return stripPrefixFromEntityName(name, deviceName) || name;
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

export const computeEntityFloorName = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"]
): string | undefined => {
  const entry = entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  const device = entry?.device_id ? devices[entry?.device_id] : undefined;

  const areaId = entry?.area_id || device?.area_id;
  const area = areaId ? areas[areaId] : undefined;
  const floor = area?.floor_id ? floors[area?.floor_id] : undefined;

  return floor ? computeFloorName(floor) : undefined;
};
