import { HomeAssistant } from "../../../types";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import { UNKNOWN, UNAVAILABLE } from "../../../data/entity";

export const findEntities = (
  hass: HomeAssistant,
  maxEntities: number,
  entities: string[],
  entitiesFill: string[],
  includeDomains?: string[],
  entityFilter?: (stateObj: HassEntity) => boolean
) => {
  let entityIds: string[];

  entityIds = entities.filter(
    (eid) =>
      hass.states[eid].state !== UNKNOWN &&
      hass.states[eid].state !== UNAVAILABLE
  );

  if (includeDomains && includeDomains.length) {
    entityIds = entityIds.filter((eid) =>
      includeDomains!.includes(computeDomain(eid))
    );
  }

  if (entityFilter) {
    entityIds = entityIds.filter(
      (eid) => hass.states[eid] && entityFilter(hass.states[eid])
    );
  }

  if (entityIds.length < (maxEntities || 1)) {
    let fillEntityIds = entitiesFill.filter(
      (eid) =>
        hass.states[eid].state !== UNKNOWN &&
        hass.states[eid].state !== UNAVAILABLE
    );

    if (includeDomains && includeDomains.length) {
      fillEntityIds = fillEntityIds.filter((eid) =>
        includeDomains!.includes(computeDomain(eid))
      );
    }

    if (entityFilter) {
      fillEntityIds = fillEntityIds.filter(
        (eid) => hass.states[eid] && entityFilter(hass.states[eid])
      );
    }

    entityIds = [...entityIds, ...fillEntityIds];
  }

  return entityIds.slice(0, maxEntities);
};
