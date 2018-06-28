// Coerce plain entity_id strings into {entity: 'entity_id'} objects
export default function coerceEntitiesToObjects(entities) {
  let singleEntity = false;

  if (!Array.isArray(entities)) {
    entities = [entities];
    singleEntity = true;
  }

  const result = [];
  entities.forEach((entity) => {
    if (typeof entity === 'string' || entity instanceof String) {
      result.push({ entity: entity });
    } else {
      result.push(entity);
    }
  });

  return singleEntity ? result[0] : result;
}
