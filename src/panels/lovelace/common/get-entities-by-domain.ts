import { HassEntities } from "home-assistant-js-websocket";

export const getEntitiesByDomain = (
  entities: HassEntities,
  domain: string
): HassEntities => {
  const domainEntities: HassEntities = {};

  for (const entity of Object.values(entities)) {
    if (entity.entity_id.split[0] === domain) {
      domainEntities[entity.entity_id] = entities[entity.entity_id];
    }
  }

  return domainEntities;
};
