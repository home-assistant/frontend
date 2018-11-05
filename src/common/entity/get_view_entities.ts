import computeDomain from "./compute_domain";
import getGroupEntities from "./get_group_entities";

// Return an object containing all entities that the view will show
// including embedded groups.
export default function getViewEntities(entities, view) {
  const viewEntities = {};

  view.attributes.entity_id.forEach((entityId) => {
    const entity = entities[entityId];

    if (entity && !entity.attributes.hidden) {
      viewEntities[entity.entity_id] = entity;

      if (computeDomain(entity.entity_id) === "group") {
        const groupEntities = getGroupEntities(entities, entity);

        Object.keys(groupEntities).forEach((grEntityId) => {
          const grEntity = groupEntities[grEntityId];

          if (!grEntity.attributes.hidden) {
            viewEntities[grEntityId] = grEntity;
          }
        });
      }
    }
  });

  return viewEntities;
}
