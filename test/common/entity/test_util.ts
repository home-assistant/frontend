/* eslint-disable camelcase, no-param-reassign */
let mockState = 1;

export function createEntity(entity) {
  mockState++;
  entity.entity_id = entity.entity_id || `test.test_${mockState}`;
  entity.last_changed = entity.last_changed || new Date().toISOString();
  entity.last_updated = entity.last_updated || entity.last_changed;
  entity.attributes = entity.attributes || {};
  return entity;
}

export function createGroup(entity) {
  mockState++;
  entity.entity_id = entity.entity_id || `group.test_${mockState}`;
  entity.state = entity.state || "on";
  entity.attributes = entity.attributes || {};
  if (!("order" in entity.attributes)) {
    entity.attributes.order = 0;
  }
  return createEntity(entity);
}

export function createView(entity) {
  entity.attributes = entity.attributes || {};
  entity.attributes.view = true;
  return createGroup(entity);
}

export function createLightEntity(isOn?) {
  mockState++;
  if (isOn === undefined) {
    isOn = Math.random() > 0.5;
  }
  return createEntity({
    entity_id: `light.mock_${mockState}`,
    state: isOn ? "on" : "off",
  });
}

export function createEntities(count) {
  const entities = {};
  for (let i = 0; i < count; i++) {
    const entity = createLightEntity();
    entities[entity.entity_id] = entity;
  }
  return entities;
}

export function entityMap(entityList) {
  const entities = {};
  entityList.forEach((entity) => {
    entities[entity.entity_id] = entity;
  });
  return entities;
}
