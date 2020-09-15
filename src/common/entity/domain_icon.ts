import { HassEntity } from "home-assistant-js-websocket";
/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import {
  DEFAULT_DOMAIN_ICON,
  FIXED_DEVICE_CLASS_ICONS,
  FIXED_DOMAIN_ICONS,
  UNIT_C,
  UNIT_F,
} from "../const";
import { batteryIcon } from "./battery_icon";

export const domainIcon = (
  domain: string,
  stateObj?: HassEntity,
  state?: string
): string => {
  const compareState = state || stateObj?.state;
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

    case "binary_sensor": {
      const is_off = compareState === "off";
      switch (stateObj?.attributes.device_class) {
        case "battery":
          return is_off ? "hass:battery" : "hass:battery-outline";
        case "battery_charging":
          return is_off ? "hass:battery" : "hass:battery-charging";
        case "cold":
          return is_off ? "hass:thermometer" : "hass:snowflake";
        case "connectivity":
          return is_off ? "hass:server-network-off" : "hass:server-network";
        case "door":
          return is_off ? "hass:door-closed" : "hass:door-open";
        case "garage_door":
          return is_off ? "hass:garage" : "hass:garage-open";
        case "gas":
        case "power":
        case "problem":
        case "safety":
        case "smoke":
          return is_off ? "hass:shield-check" : "hass:alert";
        case "heat":
          return is_off ? "hass:thermometer" : "hass:fire";
        case "light":
          return is_off ? "hass:brightness-5" : "hass:brightness-7";
        case "lock":
          return is_off ? "hass:lock" : "hass:lock-open";
        case "moisture":
          return is_off ? "hass:water-off" : "hass:water";
        case "motion":
          return is_off ? "hass:walk" : "hass:run";
        case "occupancy":
          return is_off ? "hass:home-outline" : "hass:home";
        case "opening":
          return is_off ? "hass:square" : "hass:square-outline";
        case "plug":
          return is_off ? "hass:power-plug-off" : "hass:power-plug";
        case "presence":
          return is_off ? "hass:home-outline" : "hass:home";
        case "sound":
          return is_off ? "hass:music-note-off" : "hass:music-note";
        case "vibration":
          return is_off ? "hass:crop-portrait" : "hass:vibrate";
        case "window":
          return is_off ? "hass:window-closed" : "hass:window-open";
        default:
          return is_off ? "hass:radiobox-blank" : "hass:checkbox-marked-circle";
      }
    }

    case "cover": {
      const open = compareState !== "closed";

      switch (stateObj?.attributes.device_class) {
        case "garage":
          switch (compareState) {
            case "opening":
              return "hass:arrow-up-box";
            case "closing":
              return "hass:arrow-down-box";
            case "closed":
              return "hass:garage";
            default:
              return "hass:garage-open";
          }
        case "gate":
          switch (compareState) {
            case "opening":
            case "closing":
              return "hass:gate-arrow-right";
            case "closed":
              return "hass:gate";
            default:
              return "hass:gate-open";
          }
        case "door":
          return open ? "hass:door-open" : "hass:door-closed";
        case "damper":
          return open ? "hass:circle" : "hass:circle-slice-8";
        case "shutter":
          switch (compareState) {
            case "opening":
              return "hass:arrow-up-box";
            case "closing":
              return "hass:arrow-down-box";
            case "closed":
              return "hass:window-shutter";
            default:
              return "hass:window-shutter-open";
          }
        case "blind":
        case "curtain":
          switch (compareState) {
            case "opening":
              return "hass:arrow-up-box";
            case "closing":
              return "hass:arrow-down-box";
            case "closed":
              return "hass:blinds";
            default:
              return "hass:blinds-open";
          }
        case "window":
          switch (compareState) {
            case "opening":
              return "hass:arrow-up-box";
            case "closing":
              return "hass:arrow-down-box";
            case "closed":
              return "hass:window-closed";
            default:
              return "hass:window-open";
          }
      }

      switch (compareState) {
        case "opening":
          return "hass:arrow-up-box";
        case "closing":
          return "hass:arrow-down-box";
        case "closed":
          return "hass:window-closed";
        default:
          return "hass:window-open";
      }
    }

    case "lock":
      return compareState === "unlocked" ? "hass:lock-open" : "hass:lock";

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
      const dclass = stateObj?.attributes.device_class;

      if (dclass && dclass in FIXED_DEVICE_CLASS_ICONS) {
        return FIXED_DEVICE_CLASS_ICONS[dclass];
      }

      if (dclass === "battery") {
        return stateObj ? batteryIcon(stateObj) : "hass:battery";
      }

      const unit = stateObj?.attributes.unit_of_measurement;
      if (unit === UNIT_C || unit === UNIT_F) {
        return "hass:thermometer";
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
  }

  if (domain in FIXED_DOMAIN_ICONS) {
    return FIXED_DOMAIN_ICONS[domain];
  }

  // eslint-disable-next-line
  console.warn(
    "Unable to find icon for domain " + domain + " (" + stateObj + ")"
  );
  return DEFAULT_DOMAIN_ICON;
};
