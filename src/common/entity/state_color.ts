/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UpdateEntity, updateIsInstalling } from "../../data/update";
import { alarmControlPanelColor } from "./color/alarm_control_panel_color";
import { binarySensorColor } from "./color/binary_sensor_color";
import { climateColor } from "./color/climate_color";
import { coverColor } from "./color/cover_color";
import { lockColor } from "./color/lock_color";
import { sensorColor } from "./color/sensor_color";
import { computeDomain } from "./compute_domain";
import { stateActive } from "./state_active";

export const stateColorCss = (stateObj?: HassEntity) => {
  if (!stateObj || !stateActive(stateObj)) {
    return `var(--rgb-disabled-color)`;
  }

  const color = stateColor(stateObj);

  if (color) {
    return `var(--rgb-state-${color}-color)`;
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
      return binarySensorColor(stateObj);

    case "cover":
      return coverColor(stateObj);

    case "climate":
      return climateColor(state);

    case "lock":
      return lockColor(state);

    case "light":
      return "light";

    case "humidifier":
      return "humidifier";

    case "media_player":
      return "media-player";

    case "person":
    case "device_tracker":
      return "person";

    case "sensor":
      return sensorColor(stateObj);

    case "vacuum":
      return "vacuum";

    case "sun":
      return state === "above_horizon" ? "sun-day" : "sun-night";

    case "update":
      return updateIsInstalling(stateObj as UpdateEntity)
        ? "update-installing"
        : "update";
  }

  return undefined;
};
