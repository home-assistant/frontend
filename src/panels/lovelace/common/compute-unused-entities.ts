import { LovelaceConfig, ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export const EXCLUDED_DOMAINS = ["zone", "persistent_notification"];

const addFromAction = (entities: Set<string>, actionConfig: ActionConfig) => {
  if (
    actionConfig.action !== "call-service" ||
    !actionConfig.service_data ||
    !actionConfig.service_data.entity_id
  ) {
    return;
  }
  let entityIds = actionConfig.service_data.entity_id;
  if (!Array.isArray(entityIds)) {
    entityIds = [entityIds];
  }
  for (const entityId of entityIds) {
    entities.add(entityId);
  }
};

const addEntityId = (entities: Set<string>, entity) => {
  if (typeof entity === "string") {
    entities.add(entity);
    return;
  }

  if (entity.entity) {
    entities.add(entity.entity);
  }
  if (entity.camera_image) {
    entities.add(entity.camera_image);
  }
  if (entity.tap_action) {
    addFromAction(entities, entity.tap_action);
  }
  if (entity.hold_action) {
    addFromAction(entities, entity.hold_action);
  }
};

const addEntities = (entities: Set<string>, obj) => {
  if (obj.entity) {
    addEntityId(entities, obj.entity);
  }
  if (obj.entities) {
    obj.entities.forEach((entity) => addEntityId(entities, entity));
  }
  if (obj.card) {
    addEntities(entities, obj.card);
  }
  if (obj.cards) {
    obj.cards.forEach((card) => addEntities(entities, card));
  }
  if (obj.elements) {
    obj.elements.forEach((card) => addEntities(entities, card));
  }
  if (obj.badges) {
    obj.badges.forEach((badge) => addEntityId(entities, badge));
  }
};

export const computeUsedEntities = (config) => {
  const entities = new Set<string>();
  config.views.forEach((view) => addEntities(entities, view));
  return entities;
};

export const computeUnusedEntities = (
  hass: HomeAssistant,
  config: LovelaceConfig
): string[] => {
  console.log("CALC");
  const usedEntities = computeUsedEntities(config);
  return Object.keys(hass.states)
    .filter(
      (entity) =>
        !usedEntities.has(entity) &&
        !EXCLUDED_DOMAINS.includes(entity.split(".", 1)[0])
    )
    .sort();
};
