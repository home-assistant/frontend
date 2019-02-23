import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";
import { ActionConfig } from "../../../data/lovelace";

interface Config extends LovelaceElementConfig {
  entity?: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export const computeTooltip = (hass: HomeAssistant, config: Config): string => {
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

  const tapTooltip = config.tap_action
    ? computeActionTooltip(stateName, config.tap_action, false)
    : "";
  const holdTooltip = config.hold_action
    ? computeActionTooltip(stateName, config.hold_action, true)
    : "";

  const newline = tapTooltip && holdTooltip ? "\n" : "";

  tooltip = tapTooltip + newline + holdTooltip;

  return tooltip;
};

function computeActionTooltip(
  state: string,
  config: ActionConfig,
  isHold: boolean
) {
  if (!config || !config.action || config.action === "none") {
    return "";
  }

  let tooltip = isHold ? "Hold: " : "Tap: ";

  switch (config.action) {
    case "navigate":
      tooltip += `Navigate to ${config.navigation_path}`;
      break;
    case "toggle":
      tooltip += `Toggle ${state}`;
      break;
    case "call-service":
      tooltip += `Call service ${config.service}`;
      break;
    case "more-info":
      tooltip += `Show more-info: ${state}`;
      break;
  }

  return tooltip;
}
