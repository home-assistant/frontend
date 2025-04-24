import type { HassEntity } from "home-assistant-js-websocket";
import type { AreaRegistryEntry } from "../../data/area_registry";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../data/entity_registry";
import type { FloorRegistryEntry } from "../../data/floor_registry";
import type { HomeAssistant } from "../../types";

interface EntityContext {
  device: DeviceRegistryEntry | null;
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

export const getEntityContext = (
  stateObj: HassEntity,
  hass: HomeAssistant
): EntityContext => {
  const entry = hass.entities[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  if (!entry) {
    return {
      device: null,
      area: null,
      floor: null,
    };
  }
  return getEntityEntryContext(entry, hass);
};

export const getEntityEntryContext = (
  entry:
    | EntityRegistryDisplayEntry
    | EntityRegistryEntry
    | ExtEntityRegistryEntry,
  hass: HomeAssistant
): EntityContext => {
  const deviceId = entry?.device_id;
  const device = deviceId ? hass.devices[deviceId] : null;
  const areaId = entry?.area_id || device?.area_id;
  const area = areaId ? hass.areas[areaId] : null;
  const floorId = area?.floor_id;
  const floor = floorId ? hass.floors[floorId] : null;

  return {
    device: device,
    area: area,
    floor: floor,
  };
};
