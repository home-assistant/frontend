import { callService, type HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "./compute_state_domain";
import { isUnavailableState, UNAVAILABLE } from "../../data/entity";
import type { HomeAssistant } from "../../types";

export const computeGroupEntitiesState = (states: HassEntity[]): string => {
  if (!states.length) {
    return UNAVAILABLE;
  }

  const validState = states.filter((stateObj) => isUnavailableState(stateObj));

  if (!validState) {
    return UNAVAILABLE;
  }

  // Use the first state to determine the domain
  // This assumes all states in the group have the same domain
  const domain = computeStateDomain(states[0]);

  if (domain === "cover") {
    for (const s of ["opening", "closing", "open"]) {
      if (states.some((stateObj) => stateObj.state === s)) {
        return s;
      }
    }
    return "closed";
  }

  if (states.some((stateObj) => stateObj.state === "on")) {
    return "on";
  }
  return "off";
};

export const toggleGroupEntities = (
  hass: HomeAssistant,
  states: HassEntity[]
) => {
  if (!states.length) {
    return;
  }

  // Use the first state to determine the domain
  // This assumes all states in the group have the same domain
  const domain = computeStateDomain(states[0]);

  const state = computeGroupEntitiesState(states);

  const isOn = state === "on" || state === "open";

  let service = isOn ? "turn_off" : "turn_on";
  if (domain === "cover") {
    if (state === "opening" || state === "closing") {
      // If the cover is opening or closing, we toggle it to stop it
      service = "stop_cover";
    } else {
      // For covers, we use the open/close service
      service = isOn ? "close_cover" : "open_cover";
    }
  }

  const entitiesIds = states.map((stateObj) => stateObj.entity_id);

  callService(hass.connection, domain, service, {
    entity_id: entitiesIds,
  });
};
