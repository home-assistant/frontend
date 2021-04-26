import { HassEntities } from "home-assistant-js-websocket";
import { GroupEntity } from "../../data/group";
import { computeDomain } from "./compute_domain";
import { getGroupEntities } from "./get_group_entities";

// Return an object containing all entities that the view will show
// including embedded groups.
export const getViewEntities = (
  entities: HassEntities,
  view: GroupEntity
): HassEntities => {
  const viewEntities = {};

  view.attributes.entity_id.forEach((entityId) => {
    const entity = entities[entityId];

    if (!entity) {
      return;
    }

    viewEntities[entity.entity_id] = entity;

    if (computeDomain(entity.entity_id) === "group") {
      const groupEntities = getGroupEntities(entities, entity as GroupEntity);

      Object.keys(groupEntities).forEach((grEntityId) => {
        const grEntity = groupEntities[grEntityId];

        viewEntities[grEntityId] = grEntity;
      });
    }
  });

  return viewEntities;
};
