/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE_STATES } from "../../data/entity";
import { alarmControlPanelColor } from "./color/alarm_control_panel_color";
import { binarySensorColor } from "./color/binary_sensor_color";
import { coverColor } from "./color/cover_color";
import { lockColor } from "./color/lock_color";
import { sensorColor } from "./color/sensor_color";
import { computeDomain } from "./compute_domain";

export const stateColorCss = (stateObj?: HassEntity) => {
  if (!stateObj) {
    return `var(--rgb-primary-color)`;
  }

  if (UNAVAILABLE_STATES.includes(stateObj.state)) {
    return `var(--rgb-disabled-color)`;
  }

  const color = stateColor(stateObj);

  if (color) {
    return `var(--rgb-state-${color}-color)`;
  }

  if (stateObj.state === "off") {
    return `var(--rgb-disabled-color)`;
  }

  return `var(--rgb-primary-color)`;
};

export const stateColor = (stateObj: HassEntity) => {
  const state = stateObj.state;
  const domain = computeDomain(stateObj.entity_id);

  switch (domain) {
    case "alarm_control_panel":
      return alarmControlPanelColor(state);

    case "binary_sensor":
      return binarySensorColor(state, stateObj);

    case "cover":
      return coverColor(state, stateObj);

    case "lock":
      return lockColor(state);

    case "light":
      return state === "on" ? "light-on" : "light-off";

    case "humidifier":
      return state === "on" ? "humidifier-on" : "humidifier-off";

    case "person":
    case "device_tracker":
      return state === "not_home" ? "person-not-home" : "person-home";

    case "sensor":
      return sensorColor(stateObj);
  }

  return undefined;
};
