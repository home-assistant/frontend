import {
  computeUnusedEntities,
  EXCLUDED_DOMAINS,
  computeUsedEntities,
} from "./compute-unused-entities";
import { HomeAssistant } from "../../../types";
import { LovelaceConfig } from "../../../data/lovelace";
import { computeDomain } from "../../../common/entity/compute_domain";

// TODO: Filter Out non-numeric, etc based on card needs
export const findEntities = (
  hass: HomeAssistant,
  lovelaceConfig: LovelaceConfig,
  maxEntities: number,
  includeDomains?: string[]
) => {
  let entityIds: string[];

  entityIds = computeUnusedEntities(hass, lovelaceConfig);

  if (includeDomains && includeDomains.length) {
    entityIds = entityIds.filter((eid) =>
      includeDomains!.includes(computeDomain(eid))
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

    entityIds = [...entityIds, ...usedEntityIds];
  }

  return entityIds.slice(0, maxEntities);
};
