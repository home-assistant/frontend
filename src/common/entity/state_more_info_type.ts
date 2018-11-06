import { HassEntity } from "home-assistant-js-websocket";
import computeStateDomain from "./compute_state_domain";
import { DOMAINS_HIDE_MORE_INFO, DOMAINS_WITH_MORE_INFO } from "../const";

export default function stateMoreInfoType(stateObj: HassEntity) {
  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_MORE_INFO.includes(domain)) {
    return domain;
  }
  if (DOMAINS_HIDE_MORE_INFO.includes(domain)) {
    return "hidden";
  }
  return "default";
}
