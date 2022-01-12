/** Return an icon representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { DEFAULT_DOMAIN_ICON } from "../const";
import { computeDomain } from "./compute_domain";
import { domainIcon } from "./domain_icon";

export const stateIconPath = (state?: HassEntity) => {
  if (!state) {
    return DEFAULT_DOMAIN_ICON;
  }
  return domainIcon(computeDomain(state.entity_id), state);
};
