// Parse array of entity objects from config
export default function computeConfigEntities(config) {
  const entities = config && config.entities;

  if (!entities || !Array.isArray(entities)) {
    return null;
  }

  return entities.map((entity) => {
    if (typeof entity === 'string') {
      return { entity };
    } else if (typeof entity === 'object' && !Array.isArray(entity)) {
      return entity;
    }
    return null;
  });
}
