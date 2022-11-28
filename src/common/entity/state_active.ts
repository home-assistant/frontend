import { HassEntity } from "home-assistant-js-websocket";
import { OFF_STATES, UNAVAILABLE } from "../../data/entity";
import { computeDomain } from "./compute_domain";

export function stateActive(stateObj: HassEntity, state?: string): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const compareState = state !== undefined ? state : stateObj?.state;

  if (["button", "input_button", "scene"].includes(domain)) {
    return compareState !== UNAVAILABLE;
  }

  if (OFF_STATES.includes(compareState)) {
    return false;
  }

  // Custom cases
  switch (domain) {
    case "cover":
      return !["closed", "closing"].includes(compareState);
    case "device_tracker":
    case "person":
      return compareState !== "not_home";
    case "alarm_control_panel":
      return compareState !== "disarmed";
    case "lock":
      return compareState !== "unlocked";
    case "media_player":
      return compareState !== "standby";
    case "vacuum":
      return !["idle", "docked", "paused"].includes(compareState);
    case "plant":
      return compareState === "problem";
    default:
      return true;
  }
}
