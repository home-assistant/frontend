import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";
import { ActionConfig } from "../../../data/lovelace";

export const computeTooltip = (
  hass: HomeAssistant,
  config: LovelaceElementConfig
): string => {
  if (config.title) {
    return config.title;
  }

  let stateName = "";
  let tooltip = "";

  if (config.entity) {
    stateName =
      config.entity in hass.states
        ? computeStateName(hass.states[config.entity])
        : config.entity;
  }

  if (
    config.tap_action &&
    config.tap_action.action &&
    config.tap_action.action !== "none"
  ) {
    tooltip += "Tap: " + computeActionTooltip(stateName, config.tap_action);
  }

  if (
    config.hold_action &&
    config.hold_action.action &&
    config.hold_action.action !== "none"
  ) {
    tooltip += "\nHold: " + computeActionTooltip(stateName, config.hold_action);
  }

  return tooltip;
};

function computeActionTooltip(state: string, action: ActionConfig) {
  let tooltip = "";

  switch (action.action) {
    case "navigate":
      tooltip = `Navigate to ${action.navigation_path}`;
      break;
    case "toggle":
      tooltip = `Toggle ${state}`;
      break;
    case "call-service":
      tooltip = `Call service ${action.service}`;
      break;
    case "more-info":
      tooltip = `Show more-info: ${state}`;
      break;
  }

  return tooltip;
}
