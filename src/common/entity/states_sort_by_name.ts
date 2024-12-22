/**
 * Sort function to help sort states by name
 *
 * Usage:
 *   const states = [state1, state2]
 *   states.sort(statessortStatesByName);
 */
import { HassEntity } from "home-assistant-js-websocket";
import { computeStateName } from "./compute_state_name";

export const sortStatesByName = (entityA: HassEntity, entityB: HassEntity) => {
  const nameA = computeStateName(entityA);
  const nameB = computeStateName(entityB);
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
};
