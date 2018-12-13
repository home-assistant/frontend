import { HassEntity } from "home-assistant-js-websocket";
import canToggleDomain from "./can_toggle_domain";
import computeStateDomain from "./compute_state_domain";
import { HomeAssistant } from "../../types";
import { supportsFeature } from "./supports-feature";

export default function canToggleState(
  hass: HomeAssistant,
  stateObj: HassEntity
) {
  const domain = computeStateDomain(stateObj);
  if (domain === "group") {
    return stateObj.state === "on" || stateObj.state === "off";
  }
  if (domain === "climate") {
    return supportsFeature(stateObj, 4096);
  }

  return canToggleDomain(hass, domain);
}
