import { HassEntities } from "home-assistant-js-websocket";

import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";

export const getEntitiesByArea = (
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities,
  area: string
): HassEntities => {
  const allEntities = { ...entities };
  const areaEntities: HassEntities = {};
  // TODO Actually need to bring in the area registry as well to get the area_id after matching on area name
  const areaDevices = new Set(
    deviceEntries
      .filter((device) => device.area_id === area)
      .map((device) => device.id)
  );
  for (const entity of entityEntries) {
    if (areaDevices.has(entity.device_id!) && entity.entity_id in allEntities) {
      areaEntities[entity.entity_id] = allEntities[entity.entity_id];
      delete allEntities[entity.entity_id];
    }
  }

  return areaEntities;
};
