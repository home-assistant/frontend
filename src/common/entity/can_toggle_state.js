import canToggleDomain from "./can_toggle_domain";
import computeStateDomain from "./compute_state_domain";

export default function canToggleState(hass, stateObj) {
  const domain = computeStateDomain(stateObj);
  if (domain === "group") {
    return stateObj.state === "on" || stateObj.state === "off";
  }
  if (domain === "climate") {
    return !!((stateObj.attributes || {}).supported_features & 4096);
  }

  return canToggleDomain(hass, domain);
}
