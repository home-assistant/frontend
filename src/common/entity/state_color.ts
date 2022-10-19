/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "./compute_domain";
import { domainColor } from "./domain_color";

export const stateColor = (stateObj?: HassEntity) => {
  if (!stateObj) {
    return `var(--rgb-primary-color)`;
  }
  const color = domainColor(computeDomain(stateObj.entity_id), stateObj);
  if (color) {
    return `var(--rgb-state-${color}-color)`;
  }

  return stateObj.state === "off"
    ? `var(--rgb-disabled-color)`
    : `var(--rgb-primary-color)`;
};
