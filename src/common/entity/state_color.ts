/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
import { alarmControlPanelColor } from "./color/alarm_control_panel_color";
import { binarySensorColor } from "./color/binary_sensor_color";
import { climateColor } from "./color/climate_color";
import { lockColor } from "./color/lock_color";
import { personColor } from "./color/person_color";
import { sensorColor } from "./color/sensor_color";
import { updateColor } from "./color/update_color";
import { computeDomain } from "./compute_domain";
import { stateActive } from "./state_active";

const STATIC_ACTIVE_COLORED_DOMAIN = new Set([
  "alert",
  "automation",
  "calendar",
  "camera",
  "cover",
  "fan",
  "group",
  "humidifier",
  "input_boolean",
  "light",
  "media_player",
  "remote",
  "script",
  "siren",
  "switch",
  "timer",
  "vacuum",
]);

export const stateColorCss = (stateObj: HassEntity, state?: string) => {
  const compareState = state !== undefined ? state : stateObj?.state;
  if (compareState === UNAVAILABLE) {
    return `var(--rgb-state-unavailable-color)`;
  }

  const domainColor = stateColor(stateObj, state);

  if (domainColor) {
    return `var(--rgb-state-${domainColor}-color)`;
  }

  if (!stateActive(stateObj, state)) {
    return `var(--rgb-state-inactive-color)`;
  }

  return undefined;
};

export const stateColor = (stateObj: HassEntity, state?: string) => {
  const compareState = state !== undefined ? state : stateObj?.state;
  const domain = computeDomain(stateObj.entity_id);

  if (
    STATIC_ACTIVE_COLORED_DOMAIN.has(domain) &&
    stateActive(stateObj, state)
  ) {
    return domain.replace("_", "-");
  }

  switch (domain) {
    case "alarm_control_panel":
      return alarmControlPanelColor(compareState);

    case "binary_sensor":
      return binarySensorColor(stateObj, compareState);

    case "climate":
      return climateColor(compareState);

    case "lock":
      return lockColor(compareState);

    case "person":
    case "device_tracker":
      return personColor(compareState);

    case "sensor":
      return sensorColor(stateObj, compareState);

    case "sun":
      return compareState === "above_horizon" ? "sun-day" : "sun-night";

    case "update":
      return updateColor(stateObj, compareState);
  }

  return undefined;
};
