import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "./compute_domain";

export const computeStateDomain = (stateObj: HassEntity) => {
  return computeDomain(stateObj.entity_id);
};
