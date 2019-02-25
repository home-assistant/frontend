import { HassEntities, HassEntity } from "home-assistant-js-websocket";

export const NULL = "__NULL__";

export interface AreaDeviceEntitiesMap {
  [areaId: string]: { [deviceId: string]: HassEntity[] };
}

// Group entities by area_id, device_id
// "__NULL__" used as the key for null area_id or device_id
export function groupByAreaAndDevice(
  entities: HassEntities
): AreaDeviceEntitiesMap {
  const groups: AreaDeviceEntitiesMap = {};

  Object.keys(entities).forEach((entityId) => {
    const entity = entities[entityId];

    const areaId = entity.area_id || NULL;
    if (!groups[areaId]) {
      groups[areaId] = {};
    }
    const areaMap = groups[areaId];
    const deviceId = entity.device_id || NULL;
    if (!areaMap[deviceId]) {
      areaMap[deviceId] = [entity];
    } else {
      areaMap[deviceId].push(entity);
    }
  });

  return groups;
}
