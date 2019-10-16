import { computeStateName } from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";
import { ActionConfig } from "../../../data/lovelace";

interface Config extends LovelaceElementConfig {
  entity?: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export const computeTooltip = (hass: HomeAssistant, config: Config): string => {
  if (config.title === null) {
    return "";
  }

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
    ? computeActionTooltip(hass, stateName, config.tap_action, false)
    : "";
  const holdTooltip = config.hold_action
    ? computeActionTooltip(hass, stateName, config.hold_action, true)
    : "";

  const newline = tapTooltip && holdTooltip ? "\n" : "";

  tooltip = tapTooltip + newline + holdTooltip;

  return tooltip;
};

function computeActionTooltip(
  hass: HomeAssistant,
  state: string,
  config: ActionConfig,
  isHold: boolean
) {
  if (!config || !config.action || config.action === "none") {
    return "";
  }

  let tooltip =
    (isHold
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.hold")
      : hass.localize("ui.panel.lovelace.cards.picture-elements.tap")) + " ";

  switch (config.action) {
    case "navigate":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.navigate_to",
        "location",
        config.navigation_path
      )}`;
      break;
    case "url":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.url",
        "url_path",
        config.url_path
      )}`;
      break;
    case "toggle":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.toggle",
        "name",
        state
      )}`;
      break;
    case "call-service":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.call_service",
        "name",
        config.service
      )}`;
      break;
    case "more-info":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.more_info",
        "name",
        state
      )}`;
      break;
  }

  return tooltip;
}
