import { ActionConfig, LovelaceConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export const EXCLUDED_DOMAINS = ["zone", "persistent_notification"];

const addFromAction = (entities: Set<string>, actionConfig: ActionConfig) => {
  if (
    actionConfig.action !== "call-service" ||
    (!actionConfig.target?.entity_id &&
      !actionConfig.service_data?.entity_id &&
      !actionConfig.data?.entity_id)
  ) {
    return;
  }
  let entityIds =
    actionConfig.service_data?.entity_id ??
    actionConfig.data?.entity_id ??
    actionConfig.target?.entity_id;
  if (!Array.isArray(entityIds)) {
    entityIds = [entityIds];
  }
  for (const entityId of entityIds as Array<string>) {
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
  if (obj.entities && Array.isArray(obj.entities)) {
    obj.entities.forEach((entity) => addEntityId(entities, entity));
  }
  if (obj.card) {
    addEntities(entities, obj.card);
  }
  if (obj.cards && Array.isArray(obj.cards)) {
    obj.cards.forEach((card) => addEntities(entities, card));
  }
  if (obj.elements && Array.isArray(obj.elements)) {
    obj.elements.forEach((card) => addEntities(entities, card));
  }
  if (obj.badges && Array.isArray(obj.badges)) {
    obj.badges.forEach((badge) => addEntityId(entities, badge));
  }
};

export const computeUsedEntities = (config: LovelaceConfig): Set<string> => {
  const entities = new Set<string>();
  config.views.forEach((view) => addEntities(entities, view));
  return entities;
};

export const calcUnusedEntities = (
  hass: HomeAssistant,
  usedEntities: Set<string>
): Set<string> => {
  const unusedEntities: Set<string> = new Set();

  for (const entity of Object.keys(hass.states)) {
    if (
      !usedEntities.has(entity) &&
      !EXCLUDED_DOMAINS.includes(entity.split(".", 1)[0])
    ) {
      unusedEntities.add(entity);
    }
  }

  return unusedEntities;
};

export const computeUnusedEntities = (
  hass: HomeAssistant,
  config: LovelaceConfig
): Set<string> => {
  const usedEntities = computeUsedEntities(config);
  const unusedEntities = calcUnusedEntities(hass, usedEntities);
  return unusedEntities;
};
