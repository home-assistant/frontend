import { HassEntity } from "home-assistant-js-websocket";
import { OFF_STATES } from "../../data/entity";
import { computeDomain } from "./compute_domain";

const NORMAL_UNKNOWN_DOMAIN = ["button", "input_button", "scene"];

export function stateActive(stateObj: HassEntity): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const state = stateObj.state;

  if (
    OFF_STATES.includes(state) &&
    !(NORMAL_UNKNOWN_DOMAIN.includes(domain) && state === "unknown")
  ) {
    return false;
  }

  // Custom cases
  switch (domain) {
    case "cover":
      return state === "open" || state === "opening";
    case "device_tracker":
    case "person":
      return state === "home";
    case "media-player":
      return state !== "idle";
    case "vacuum":
      return state === "on" || state === "cleaning";
    case "plant":
      return state === "problem";
    default:
      return true;
  }
}
