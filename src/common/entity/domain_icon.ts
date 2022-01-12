import {
  mdiAccount,
  mdiAccountArrowRight,
  mdiAirHumidifier,
  mdiAirHumidifierOff,
  mdiBluetooth,
  mdiBluetoothConnect,
  mdiCalendar,
  mdiCast,
  mdiCastConnected,
  mdiClock,
  mdiEmoticonDead,
  mdiFlash,
  mdiGestureTapButton,
  mdiLanConnect,
  mdiLanDisconnect,
  mdiLock,
  mdiLockAlert,
  mdiLockClock,
  mdiLockOpen,
  mdiPackageUp,
  mdiPowerPlug,
  mdiPowerPlugOff,
  mdiRestart,
  mdiSleep,
  mdiTimerSand,
  mdiToggleSwitch,
  mdiToggleSwitchOff,
  mdiCheckCircleOutline,
  mdiCloseCircleOutline,
  mdiWeatherNight,
  mdiZWave,
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

    case "button":
      switch (stateObj?.attributes.device_class) {
        case "restart":
          return mdiRestart;
        case "update":
          return mdiPackageUp;
        default:
          return mdiGestureTapButton;
      }

    case "cover":
      return coverIcon(compareState, stateObj);

    case "device_tracker":
      if (stateObj?.attributes.source_type === "router") {
        return compareState === "home" ? mdiLanConnect : mdiLanDisconnect;
      }
      if (
        ["bluetooth", "bluetooth_le"].includes(stateObj?.attributes.source_type)
      ) {
        return compareState === "home" ? mdiBluetoothConnect : mdiBluetooth;
      }
      return compareState === "not_home" ? mdiAccountArrowRight : mdiAccount;

    case "humidifier":
      return state && state === "off" ? mdiAirHumidifierOff : mdiAirHumidifier;

    case "input_boolean":
      return compareState === "on"
        ? mdiCheckCircleOutline
        : mdiCloseCircleOutline;

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

    case "switch":
      switch (stateObj?.attributes.device_class) {
        case "outlet":
          return compareState === "on" ? mdiPowerPlug : mdiPowerPlugOff;
        case "switch":
          return compareState === "on" ? mdiToggleSwitch : mdiToggleSwitchOff;
        default:
          return mdiFlash;
      }

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
