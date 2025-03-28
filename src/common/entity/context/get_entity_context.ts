import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../data/entity_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface EntityContext {
  entity: EntityRegistryDisplayEntry | null;
  device: DeviceRegistryEntry | null;
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

export const getEntityContext = (
  entityId: string,
  hass: HomeAssistant
): EntityContext => {
  const entity =
    (hass.entities[entityId] as EntityRegistryDisplayEntry | undefined) || null;

  if (!entity) {
    return {
      entity: null,
      device: null,
      area: null,
      floor: null,
    };
  }

  const deviceId = entity?.device_id;
  const device = deviceId ? hass.devices[deviceId] : null;
  const areaId = entity?.area_id || device?.area_id;
  const area = areaId ? hass.areas[areaId] : null;
  const floorId = area?.floor_id;
  const floor = floorId ? hass.floors[floorId] : null;

  return {
    entity: entity,
    device: device,
    area: area,
    floor: floor,
  };
};
