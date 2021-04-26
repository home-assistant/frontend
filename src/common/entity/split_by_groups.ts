import { HassEntities } from "home-assistant-js-websocket";
import { GroupEntity } from "../../data/group";
import { computeDomain } from "./compute_domain";

// Split a collection into a list of groups and a 'rest' list of ungrouped
// entities.
// Returns { groups: [], ungrouped: {} }
export const splitByGroups = (entities: HassEntities) => {
  const groups: GroupEntity[] = [];
  const ungrouped: HassEntities = {};

  Object.keys(entities).forEach((entityId) => {
    const entity = entities[entityId];

    if (computeDomain(entityId) === "group") {
      groups.push(entity as GroupEntity);
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
};
