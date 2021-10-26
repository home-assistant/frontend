import {
  mdiAirHumidifierOff,
  mdiAirHumidifier,
  mdiLockOpen,
  mdiLockAlert,
  mdiLockClock,
  mdiLock,
  mdiCastConnected,
  mdiCast,
  mdiEmoticonDead,
  mdiSleep,
  mdiTimerSand,
  mdiZWave,
  mdiClock,
  mdiCalendar,
  mdiWeatherNight,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import { DEFAULT_DOMAIN_ICON, FIXED_DOMAIN_ICONS } from "../const";
import { alarmPanelIcon } from "./alarm_panel_icon";
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
      return alarmPanelIcon(compareState);

    case "binary_sensor":
      return binarySensorIcon(compareState, stateObj);

    case "cover":
      return coverIcon(compareState, stateObj);

    case "humidifier":
      return state && state === "off" ? mdiAirHumidifierOff : mdiAirHumidifier;

    case "lock":
      switch (compareState) {
        case "unlocked":
          return mdiLockOpen;
        case "jammed":
          return mdiLockAlert;
        case "locking":
        case "unlocking":
          return mdiLockClock;
        default:
          return mdiLock;
      }

    case "media_player":
      return compareState === "playing" ? mdiCastConnected : mdiCast;

    case "zwave":
      switch (compareState) {
        case "dead":
          return mdiEmoticonDead;
        case "sleeping":
          return mdiSleep;
        case "initializing":
          return mdiTimerSand;
        default:
          return mdiZWave;
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
        return mdiClock;
      }
      if (!stateObj.attributes.has_time) {
        return mdiCalendar;
      }
      break;

    case "sun":
      return stateObj?.state === "above_horizon"
        ? FIXED_DOMAIN_ICONS[domain]
        : mdiWeatherNight;
  }

  if (domain in FIXED_DOMAIN_ICONS) {
    return FIXED_DOMAIN_ICONS[domain];
  }

  // eslint-disable-next-line
  console.warn(`Unable to find icon for domain ${domain}`);
  return DEFAULT_DOMAIN_ICON;
};
