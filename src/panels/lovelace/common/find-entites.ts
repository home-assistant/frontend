import { HomeAssistant } from "../../../types";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import { UNKNOWN, UNAVAILABLE } from "../../../data/entity";

const arrayFilter = (
  array: any[],
  conditions: Array<(value: any) => boolean>,
  maxSize: number
) => {
  if (!maxSize || maxSize > array.length) {
    return array;
  }

  const filteredArray: any[] = [];

  for (let i = 0; i < array.length && filteredArray.length < maxSize; i++) {
    let meetsConditions = true;
    conditions.forEach((condition) => {
      if (!condition(array[i])) {
        meetsConditions = false;
        return;
      }
    });

    if (meetsConditions) {
      filteredArray.push(array[i]);
    }
  }

  return filteredArray;
};

export const findEntities = (
  hass: HomeAssistant,
  maxEntities: number,
  entities: string[],
  entitiesFallback: string[],
  includeDomains?: string[],
  entityFilter?: (stateObj: HassEntity) => boolean
) => {
  let entityIds: string[];

  const conditions: Array<(value: string) => boolean> = [
    (eid) =>
      hass.states[eid] &&
      hass.states[eid].state !== UNKNOWN &&
      hass.states[eid].state !== UNAVAILABLE,
  ];

  if (includeDomains && includeDomains.length) {
    conditions.push((eid) => includeDomains!.includes(computeDomain(eid)));
  }

  if (entityFilter) {
    conditions.push((eid) => entityFilter(hass.states[eid]));
  }

  entityIds = arrayFilter(entities, conditions, maxEntities);

  if (entityIds.length < maxEntities && entitiesFallback.length) {
    const fillEntityIds = findEntities(
      hass,
      maxEntities - entityIds.length,
      entitiesFallback,
      [],
      includeDomains,
      entityFilter
    );

    entityIds = [...entityIds, ...fillEntityIds];
  }

  return entityIds;
};
