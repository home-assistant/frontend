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

/**
 * Retrieves the context of an entity, including its associated device, area, and floor.
 *
 * @param entityId - The unique identifier of the entity to retrieve the context for.
 * @param hass - The Home Assistant object containing the registry data for entities, devices, areas, and floors.
 * @returns An object containing the entity, its associated device, area, and floor, or `null` for each if not found.
 *
 * The returned `EntityContext` object includes:
 * - `entity`: The entity registry entry, or `null` if the entity is not found.
 * - `device`: The device registry entry associated with the entity, or `null` if not found.
 * - `area`: The area registry entry associated with the entity or device, or `null` if not found.
 * - `floor`: The floor registry entry associated with the area, or `null` if not found.
 */
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
