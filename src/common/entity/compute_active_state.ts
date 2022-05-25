import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE_STATES } from "../../data/entity";

export const computeActiveState = (stateObj: HassEntity): string => {
  if (UNAVAILABLE_STATES.includes(stateObj.state)) {
    return stateObj.state;
  }

  const domain = stateObj.entity_id.split(".")[0];
  let state = stateObj.state;

  if (domain === "climate") {
    state = stateObj.attributes.hvac_action;
  }

  return state;
};
