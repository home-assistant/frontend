/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
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

  const color = stateColor(stateObj);

  if (color) {
    return `var(--rgb-state-${color}-color)`;
  }

  return stateObj.state === "off"
    ? `var(--rgb-disabled-color)`
    : `var(--rgb-primary-color)`;
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

    case "sensor":
      return sensorColor(stateObj);
  }

  return undefined;
};
