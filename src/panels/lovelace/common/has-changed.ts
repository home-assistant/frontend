import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../types";
import { processConfigEntities } from "./process-config-entities";

// `hasConfigOrEntitiesChanged` runs in `shouldUpdate` on every state change, but
// the entities config only changes on (re)configure. Cache the parsed result per
// config array so it is parsed once and reused instead of re-allocated on every
// state change. A new config array misses the cache; a non-array still throws via
// `processConfigEntities`.
const processedConfigEntitiesCache = new WeakMap<object, any[]>();

const getConfigEntities = (entities: any): any[] => {
  let processed = processedConfigEntitiesCache.get(entities);
  if (!processed) {
    processed = processConfigEntities(entities, false);
    processedConfigEntitiesCache.set(entities, processed);
  }
  return processed;
};

export function hasConfigChanged(
  element: any,
  changedProps: PropertyValues
): boolean {
  if (changedProps.has("_config")) {
    return true;
  }

  if (!changedProps.has("hass")) {
    return false;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
  if (!oldHass) {
    return true;
  }

  if (
    oldHass.connected !== element.hass!.connected ||
    oldHass.themes !== element.hass!.themes ||
    oldHass.locale !== element.hass!.locale ||
    oldHass.localize !== element.hass.localize ||
    oldHass.formatEntityState !== element.hass.formatEntityState ||
    oldHass.formatEntityAttributeName !==
      element.hass.formatEntityAttributeName ||
    oldHass.formatEntityAttributeValue !==
      element.hass.formatEntityAttributeValue ||
    oldHass.config.state !== element.hass.config.state
  ) {
    return true;
  }
  return false;
}

function compareEntityState(
  oldHass: HomeAssistant,
  newHass: HomeAssistant,
  entityId: string
) {
  const oldState = oldHass.states[entityId] as HassEntity | undefined;
  const newState = newHass.states[entityId] as HassEntity | undefined;

  return oldState !== newState;
}

function compareEntityDisplayEntry(
  oldHass: HomeAssistant,
  newHass: HomeAssistant,
  entityId: string
) {
  const oldEntry = oldHass.entities[entityId] as
    | EntityRegistryDisplayEntry
    | undefined;
  const newEntry = newHass.entities[entityId] as
    | EntityRegistryDisplayEntry
    | undefined;

  return oldEntry?.display_precision !== newEntry?.display_precision;
}

// Check if config or Entity changed
export function hasConfigOrEntityChanged(
  element: any,
  changedProps: PropertyValues
): boolean {
  if (hasConfigChanged(element, changedProps)) {
    return true;
  }

  if (!changedProps.has("hass")) {
    return false;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant;
  const newHass = element.hass as HomeAssistant;

  return (
    compareEntityState(oldHass, newHass, element._config!.entity) ||
    compareEntityDisplayEntry(oldHass, newHass, element._config!.entity)
  );
}

// Check if config or Entities changed
export function hasConfigOrEntitiesChanged(
  element: any,
  changedProps: PropertyValues
): boolean {
  if (hasConfigChanged(element, changedProps)) {
    return true;
  }

  if (!changedProps.has("hass")) {
    return false;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant;
  const newHass = element.hass as HomeAssistant;

  const entities = getConfigEntities(element._config!.entities);

  return entities.some((entity) => {
    if (!("entity" in entity)) {
      return false;
    }

    return (
      compareEntityState(oldHass, newHass, entity.entity) ||
      compareEntityDisplayEntry(oldHass, newHass, entity.entity)
    );
  });
}
