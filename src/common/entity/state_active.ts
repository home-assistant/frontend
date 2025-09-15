import type { HassEntity } from "home-assistant-js-websocket";
import { isUnavailableState, OFF, UNAVAILABLE } from "../../data/entity";
import { computeDomain } from "./compute_domain";

export function stateActive(stateObj: HassEntity, state?: string): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const compareState = state !== undefined ? state : stateObj?.state;
  return domainStateActive(domain, compareState);
}

export function domainStateActive(domain: string, state: string) {
  if (["button", "event", "input_button", "scene"].includes(domain)) {
    return state !== UNAVAILABLE;
  }

  if (isUnavailableState(state)) {
    return false;
  }

  // The "off" check is relevant for most domains, but there are exceptions
  // such as "alert" where "off" is still a somewhat active state and
  // therefore gets a custom color and "idle" is instead the state that
  // matches what most other domains consider inactive.
  if (state === OFF && domain !== "alert") {
    return false;
  }

  // Custom cases
  switch (domain) {
    case "alarm_control_panel":
      return state !== "disarmed";
    case "alert":
      // "on" and "off" are active, as "off" just means alert was acknowledged but is still active
      return state !== "idle";
    case "cover":
      return state !== "closed";
    case "device_tracker":
    case "person":
      return state !== "not_home";
    case "lawn_mower":
      return ["mowing", "error"].includes(state);
    case "lock":
      return state !== "locked";
    case "media_player":
      return state !== "standby";
    case "vacuum":
      return !["idle", "docked", "paused"].includes(state);
    case "valve":
      return state !== "closed";
    case "plant":
      return state === "problem";
    case "group":
      return ["on", "home", "open", "locked", "problem"].includes(state);
    case "timer":
      return state === "active";
    case "camera":
      return state === "streaming";
  }

  return true;
}
