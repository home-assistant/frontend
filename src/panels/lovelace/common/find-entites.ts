import {
  computeUnusedEntities,
  EXCLUDED_DOMAINS,
  computeUsedEntities,
} from "./compute-unused-entities";
import { HomeAssistant } from "../../../types";
import { LovelaceConfig } from "../../../data/lovelace";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";

export const findEntities = (
  hass: HomeAssistant,
  lovelaceConfig: LovelaceConfig,
  maxEntities: number,
  entities?: string[],
  entitiesFill?: string[],
  includeDomains?: string[],
  entityFilter?: (stateObj: HassEntity) => boolean
) => {
  let entityIds: string[];

  entityIds =
    entities && entities.length
      ? entities
      : computeUnusedEntities(hass, lovelaceConfig);

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
    let fillEntityIds =
      entitiesFill && entitiesFill.length
        ? entitiesFill
        : [...computeUsedEntities(lovelaceConfig)];

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
