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

export const stateColorCss = (stateObj?: HassEntity, state?: string) => {
  if (!stateObj || !stateActive(stateObj, state)) {
    return `var(--rgb-disabled-color)`;
  }

  const color = stateColor(stateObj, state);

  if (color) {
    return `var(--rgb-state-${color}-color)`;
  }

  return `var(--rgb-state-default-color)`;
};

export const stateColor = (stateObj: HassEntity, state?: string) => {
  const compareState = state !== undefined ? state : stateObj?.state;
  const domain = computeDomain(stateObj.entity_id);

  switch (domain) {
    case "alarm_control_panel":
      return alarmControlPanelColor(compareState);

    case "binary_sensor":
      return binarySensorColor(stateObj);

    case "cover":
      return coverColor(stateObj);

    case "climate":
      return climateColor(compareState);

    case "lock":
      return lockColor(compareState);

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

    case "siren":
      return "siren";

    case "sun":
      return compareState === "above_horizon" ? "sun-day" : "sun-night";

    case "switch":
      return "switch";

    case "update":
      return updateIsInstalling(stateObj as UpdateEntity)
        ? "update-installing"
        : "update";
  }

  return undefined;
};
