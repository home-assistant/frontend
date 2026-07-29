import type { HassEntity } from "home-assistant-js-websocket";
import { isTiltOnly } from "../../data/cover";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity/entity";
import { CoverEntityFeature } from "../../data/feature/cover_entity_feature";
import type { HomeAssistant } from "../../types";
import { computeStateDomain } from "./compute_state_domain";
import { getToggleAction } from "./get_toggle_action";
import { supportsFeature } from "./supports-feature";

// Tilt-only covers can only stop their tilt, and may not support it at all
const getStopAction = (stateObj: HassEntity): string | undefined => {
  if (!isTiltOnly(stateObj)) {
    return "stop_cover";
  }
  return supportsFeature(stateObj, CoverEntityFeature.STOP_TILT)
    ? "stop_cover_tilt"
    : undefined;
};

export const computeGroupEntitiesState = (states: HassEntity[]): string => {
  if (!states.length) {
    return UNAVAILABLE;
  }

  const allUnavailable = states.every(
    (stateObj) => stateObj.state === UNAVAILABLE
  );
  if (allUnavailable) {
    return UNAVAILABLE;
  }

  const hasValidState = states.some(
    (stateObj) => stateObj.state !== UNAVAILABLE && stateObj.state !== UNKNOWN
  );
  if (!hasValidState) {
    return UNKNOWN;
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

  // If the cover is opening or closing, we toggle it to stop it
  const stopping =
    domain === "cover" && (state === "opening" || state === "closing");

  // The service can differ per entity, e.g. for tilt-only covers,
  // so group the entities by the service they need
  const entityIdsByService: Record<string, string[]> = {};
  states.forEach((stateObj) => {
    const service = stopping
      ? getStopAction(stateObj)
      : getToggleAction(domain, !isOn, stateObj);
    if (!service) {
      return;
    }
    if (!(service in entityIdsByService)) {
      entityIdsByService[service] = [];
    }
    entityIdsByService[service].push(stateObj.entity_id);
  });

  Object.entries(entityIdsByService).forEach(([service, entityIds]) => {
    hass.callService(domain, service, {
      entity_id: entityIds,
    });
  });
};
