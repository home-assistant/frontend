/** Coerce plain entity_id strings into {entity: 'entity_id'} objects **/
export default function coerceEntitiesToObjects(entities) {
  if (!Array.isArray(entities))
    return entities;

  const result = [];
  entities.forEach(entity => {
    if (typeof entity === 'string' || entity instanceof String) {
      result.push({entity: entity});
    } else {
      result.push(entity);
    }
  });

  return result;
}
