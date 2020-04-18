/** Return an icon representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { DEFAULT_DOMAIN_ICON } from "../const";
import { binarySensorIcon } from "./binary_sensor_icon";
import { computeDomain } from "./compute_domain";
import { coverIcon } from "./cover_icon";
import { domainIcon } from "./domain_icon";
import { inputDateTimeIcon } from "./input_dateteime_icon";
import { sensorIcon } from "./sensor_icon";

const domainIcons = {
  binary_sensor: binarySensorIcon,
  cover: coverIcon,
  sensor: sensorIcon,
  input_datetime: inputDateTimeIcon,
};

export const stateIcon = (state: HassEntity) => {
  if (!state) {
    return DEFAULT_DOMAIN_ICON;
  }
  if (state.attributes.icon) {
    return state.attributes.icon;
  }

  const domain = computeDomain(state.entity_id);

  if (domain in domainIcons) {
    return domainIcons[domain](state);
  }
  return domainIcon(domain, state.state);
};
