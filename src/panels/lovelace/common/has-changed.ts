import { HomeAssistant } from "../../../types";

// Check if config or Entity changed
export default function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("_config")) {
    return true;
  }

  const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
  if (oldHass) {
    return (
      oldHass.states[element._config!.entity] !==
      element.hass!.states[element._config!.entity]
    );
  }

  return true;
}
