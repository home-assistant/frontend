import { HassEntity } from "home-assistant-js-websocket";
import { OFF_STATES } from "../../data/entity";
import { computeDomain } from "./compute_domain";

const NORMAL_UNKNOWN_DOMAIN = ["button", "input_button", "scene"];
const NORMAL_OFF_DOMAIN = ["script"];

export function stateActive(stateObj: HassEntity, state?: string): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const compareState = state !== undefined ? state : stateObj?.state;

  if (
    OFF_STATES.includes(compareState) &&
    !(NORMAL_UNKNOWN_DOMAIN.includes(domain) && compareState === "unknown") &&
    !(NORMAL_OFF_DOMAIN.includes(domain) && compareState === "script")
  ) {
    return false;
  }

  // Custom cases
  switch (domain) {
    case "cover":
      return compareState === "open" || compareState === "opening";
    case "device_tracker":
    case "person":
      return compareState !== "not_home";
    case "media_player":
      return compareState !== "idle" && compareState !== "standby";
    case "vacuum":
      return compareState === "on" || compareState === "cleaning";
    case "plant":
      return compareState === "problem";
    default:
      return true;
  }
}
