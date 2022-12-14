import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNAVAILABLE_STATES } from "../../data/entity";
import { computeDomain } from "./compute_domain";

export function stateActive(stateObj: HassEntity, state?: string): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const compareState = state !== undefined ? state : stateObj?.state;

  if (["button", "input_button", "scene"].includes(domain)) {
    return compareState !== UNAVAILABLE;
  }

  if (UNAVAILABLE_STATES.includes(compareState)) {
    return false;
  }

  // Custom cases
  switch (domain) {
    case "alarm_control_panel":
      return compareState !== "disarmed";
    case "alert":
      return compareState !== "idle";
    case "cover":
      return !["closed", "closing"].includes(compareState);
    case "device_tracker":
    case "person":
      return compareState !== "not_home";
    case "lock":
      return compareState !== "locked";
    case "media_player":
      return compareState !== "standby";
    case "vacuum":
      return !["idle", "docked", "paused"].includes(compareState);
    case "plant":
      return compareState === "problem";
    case "group":
      return ["on", "home", "open", "locked", "problem"].includes(compareState);
    case "timer":
      return compareState === "active";
    case "camera":
      return compareState === "streaming";
  }

  // Needs to be after the switch statement since some domains such as "alert"
  // do not consider "off" an inactive state (as there is "idle" for example).
  if (compareState === "off") {
    return false;
  }

  return true;
}
