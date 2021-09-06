import { HassEntity } from "home-assistant-js-websocket";
/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import { DEFAULT_DOMAIN_ICON, FIXED_DOMAIN_ICONS } from "../const";
import { binarySensorIcon } from "./binary_sensor_icon";
import { coverIcon } from "./cover_icon";
import { sensorIcon } from "./sensor_icon";

export const domainIcon = (
  domain: string,
  stateObj?: HassEntity,
  state?: string
): string => {
  const compareState = state !== undefined ? state : stateObj?.state;

  switch (domain) {
    case "alarm_control_panel":
      switch (compareState) {
        case "armed_home":
          return "hass:bell-plus";
        case "armed_night":
          return "hass:bell-sleep";
        case "disarmed":
          return "hass:bell-outline";
        case "triggered":
          return "hass:bell-ring";
        default:
          return "hass:bell";
      }

    case "binary_sensor":
      return binarySensorIcon(compareState, stateObj);

    case "cover":
      return coverIcon(compareState, stateObj);

    case "humidifier":
      return state && state === "off"
        ? "hass:air-humidifier-off"
        : "hass:air-humidifier";

    case "lock":
      switch (compareState) {
        case "unlocked":
          return "hass:lock-open";
        case "jammed":
          return "hass:lock-alert";
        case "locking":
        case "unlocking":
          return "hass:lock-clock";
        default:
          return "hass:lock";
      }

    case "media_player":
      return compareState === "playing" ? "hass:cast-connected" : "hass:cast";

    case "zwave":
      switch (compareState) {
        case "dead":
          return "hass:emoticon-dead";
        case "sleeping":
          return "hass:sleep";
        case "initializing":
          return "hass:timer-sand";
        default:
          return "hass:z-wave";
      }

    case "sensor": {
      const icon = sensorIcon(stateObj);
      if (icon) {
        return icon;
      }

      break;
    }

    case "input_datetime":
      if (!stateObj?.attributes.has_date) {
        return "hass:clock";
      }
      if (!stateObj.attributes.has_time) {
        return "hass:calendar";
      }
      break;

    case "sun":
      return stateObj?.state === "above_horizon"
        ? FIXED_DOMAIN_ICONS[domain]
        : "hass:weather-night";
  }

  if (domain in FIXED_DOMAIN_ICONS) {
    return FIXED_DOMAIN_ICONS[domain];
  }

  // eslint-disable-next-line
  console.warn(`Unable to find icon for domain ${domain}`);
  return DEFAULT_DOMAIN_ICON;
};
