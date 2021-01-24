import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
import { HomeAssistant } from "../../types";
import { DOMAINS_WITH_CARD } from "../const";
import { canToggleState } from "./can_toggle_state";
import { computeStateDomain } from "./compute_state_domain";

export const stateCardType = (hass: HomeAssistant, stateObj: HassEntity) => {
  if (stateObj.state === UNAVAILABLE) {
    return "display";
  }

  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_CARD.includes(domain)) {
    return domain;
  }
  if (
    canToggleState(hass, stateObj) &&
    stateObj.attributes.control !== "hidden"
  ) {
    return "toggle";
  }
  return "display";
};
