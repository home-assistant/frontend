import computeDomain from "./compute_domain";
import { HassEntity, HassEntities } from "home-assistant-js-websocket";

// Split a collection into a list of groups and a 'rest' list of ungrouped
// entities.
// Returns { groups: [], ungrouped: {} }
export default function splitByGroups(entities: HassEntities) {
  const groups: HassEntity[] = [];
  const ungrouped: HassEntities = {};

  Object.keys(entities).forEach((entityId) => {
    const entity = entities[entityId];

    if (computeDomain(entityId) === "group") {
      groups.push(entity);
    } else {
      ungrouped[entityId] = entity;
    }
  });

  groups.forEach((group) =>
    group.attributes.entity_id.forEach((entityId) => {
      delete ungrouped[entityId];
    })
  );

  return { groups, ungrouped };
}
