import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "./compute_domain";

export const computeStateDomain = (stateObj: HassEntity) =>
  computeDomain(stateObj.entity_id);
