import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";

export const computeTooltip = (
  hass: HomeAssistant,
  config: LovelaceElementConfig
): string => {
  if (config.title) {
    return config.title;
  }

  let stateName = "";
  let tooltip: string;

  if (config.entity) {
    stateName =
      config.entity in hass.states
        ? computeStateName(hass.states[config.entity])
        : config.entity;
  }

  switch (config.tap_action) {
    case "navigate":
      tooltip = `Navigate to ${config.navigation_path}`;
      break;
    case "toggle":
      tooltip = `Toggle ${stateName}`;
      break;
    case "call-service":
      tooltip = `Call service ${config.service}`;
      break;
    default:
      tooltip = `Show more-info: ${stateName}`;
  }

  return tooltip;
};
