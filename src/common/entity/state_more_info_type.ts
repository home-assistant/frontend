import { HassEntity } from "home-assistant-js-websocket";
import { DOMAINS_HIDE_MORE_INFO, DOMAINS_WITH_MORE_INFO } from "../const";
import { computeStateDomain } from "./compute_state_domain";

export const stateMoreInfoType = (stateObj: HassEntity) => {
  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_MORE_INFO.includes(domain)) {
    return domain;
  }
  if (DOMAINS_HIDE_MORE_INFO.includes(domain)) {
    return "hidden";
  }
  return "default";
};
