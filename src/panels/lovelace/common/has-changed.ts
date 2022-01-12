import { PropertyValues } from "lit";
import { HomeAssistant } from "../../../types";
import { processConfigEntities } from "./process-config-entities";

function hasConfigChanged(element: any, changedProps: PropertyValues): boolean {
  if (changedProps.has("_config")) {
    return true;
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
    oldHass.config.state !== element.hass.config.state
  ) {
    return true;
  }
  return false;
}

// Check if config or Entity changed
export function hasConfigOrEntityChanged(
  element: any,
  changedProps: PropertyValues
): boolean {
  if (hasConfigChanged(element, changedProps)) {
    return true;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant;

  return (
    oldHass.states[element._config!.entity] !==
    element.hass!.states[element._config!.entity]
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

  const oldHass = changedProps.get("hass") as HomeAssistant;

  const entities = processConfigEntities(element._config!.entities, false);

  return entities.some(
    (entity) =>
      "entity" in entity &&
      oldHass.states[entity.entity] !== element.hass!.states[entity.entity]
  );
}
