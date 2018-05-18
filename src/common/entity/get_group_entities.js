export default function getGroupEntities(entities, group) {
  const result = {};

  group.attributes.entity_id.forEach((entityId) => {
    const entity = entities[entityId];

    if (entity) {
      result[entity.entity_id] = entity;
    }
  });

  return result;
}
