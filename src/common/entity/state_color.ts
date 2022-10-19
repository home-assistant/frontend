/** Return an icon representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "./compute_domain";
import { domainColor } from "./domain_color";

export const stateColor = (state?: HassEntity) => {
  if (!state) {
    return `var(--rgb-primary-color)`;
  }
  const color = domainColor(computeDomain(state.entity_id), state);
  if (!color) {
    return state.state === "off"
      ? `var(--rgb-disabled-color)`
      : `var(--rgb-primary-color)`;
  }
  return `var(--rgb-state-${color}-color)`;
};
