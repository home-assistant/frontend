import { HomeAssistant } from "../../../types";
import { PropertyValues } from "lit-element";

// Check if config or Entity changed
export function hasConfigOrEntityChanged(
  element: any,
  changedProps: PropertyValues
): boolean {
  if (changedProps.has("_config")) {
    return true;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
  if (!oldHass) {
    return true;
  }

  if (
    oldHass.themes !== element.hass!.themes ||
    oldHass.language !== element.hass!.language
  ) {
    return true;
  }

  return (
    oldHass.states[element._config!.entity] !==
      element.hass!.states[element._config!.entity] ||
    oldHass.localize !== element.hass.localize
  );
}
