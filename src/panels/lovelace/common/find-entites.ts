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
  includeDomains?: string[],
  entityFilter?: (stateObj: HassEntity) => boolean
) => {
  let entityIds: string[];

  entityIds = computeUnusedEntities(hass, lovelaceConfig);

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
    let usedEntityIds = [...computeUsedEntities(lovelaceConfig)];

    usedEntityIds = usedEntityIds.filter(
      (eid) => !EXCLUDED_DOMAINS.includes(eid)[0]
    );

    if (includeDomains && includeDomains.length) {
      usedEntityIds = usedEntityIds.filter((eid) =>
        includeDomains!.includes(computeDomain(eid))
      );
    }

    if (entityFilter) {
      usedEntityIds = usedEntityIds.filter(
        (eid) => hass.states[eid] && entityFilter(hass.states[eid])
      );
    }

    entityIds = [...entityIds, ...usedEntityIds];
  }

  return entityIds.slice(0, maxEntities);
};
