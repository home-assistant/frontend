import { computeStateName } from "../../../common/entity/compute_state_name";
import { ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

interface Config {
  entity?: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

function computeActionTooltip(
  hass: HomeAssistant,
  state: string,
  config: ActionConfig,
  isHold: boolean
) {
  if (!config || !config.action || config.action === "none") {
    return "";
  }

  return (
    (isHold
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.hold")
      : hass.localize("ui.panel.lovelace.cards.picture-elements.tap")) +
    " " +
    (config.action === "navigate"
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.navigate_to", {
          location: config.navigation_path,
        })
      : config.action === "url"
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.url", {
          url_path: config.url_path,
        })
      : config.action === "toggle"
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.toggle", {
          name: state,
        })
      : config.action === "call-service"
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.call_service", {
          name: config.service,
        })
      : config.action === "more-info"
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.more_info", {
          name: state,
        })
      : "")
  );
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

  if (!config.tap_action && !config.hold_action) {
    return stateName;
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
