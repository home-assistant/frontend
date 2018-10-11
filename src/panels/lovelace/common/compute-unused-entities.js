const EXCLUDED_DOMAINS = ["zone"];

function computeUsedEntities(config) {
  const entities = new Set();

  function addEntityId(entity) {
    if (typeof entity === "string") {
      entities.add(entity);
    } else if (entity.entity) {
      entities.add(entity.entity);
    }
  }

  function addEntities(obj) {
    if (obj.entity) addEntityId(obj.entity);
    if (obj.entities) obj.entities.forEach((entity) => addEntityId(entity));
    if (obj.card) addEntities(obj.card);
    if (obj.cards) obj.cards.forEach((card) => addEntities(card));
    if (obj.badges) obj.badges.forEach((badge) => addEntityId(badge));
  }

  config.views.forEach((view) => addEntities(view));
  return entities;
}

export default function computeUnusedEntities(hass, config) {
  const usedEntities = computeUsedEntities(config);
  return Object.keys(hass.states)
    .filter(
      (entity) =>
        !usedEntities.has(entity) &&
        !(
          config.excluded_entities && config.excluded_entities.includes(entity)
        ) &&
        !EXCLUDED_DOMAINS.includes(entity.split(".", 1)[0])
    )
    .sort();
}
