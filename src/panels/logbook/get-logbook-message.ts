import { HassEntity } from "home-assistant-js-websocket";

const STATE_ON = "on";
const STATE_OFF = "off";

export const getLogbookMessage = (
  state: string,
  stateObj: HassEntity,
  domain: string
): string => {
  switch (domain) {
    case "device_tracker":
    case "person":
      return state === "not_home" ? "is away" : `is at ${state}`;

    case "sun":
      return state === "above_horizon" ? "has risen" : "has set";

    case "binary_sensor": {
      const isOn = state === STATE_ON;
      const isOff = state === STATE_OFF;
      const device_class = stateObj.attributes.device_class;

      switch (device_class) {
        case "battery":
          if (isOn) {
            return "is low";
          }
          if (isOff) {
            return "is normal";
          }
          break;

        case "connectivity":
          if (isOn) {
            return "is connected";
          }
          if (isOff) {
            return "is disconnected";
          }
          break;

        case "door":
        case "garage_door":
        case "opening":
        case "window":
          if (isOn) {
            return "is opened";
          }
          if (isOff) {
            return "is closed";
          }
          break;

        case "lock":
          if (isOn) {
            return "is unlocked";
          }
          if (isOff) {
            return "is locked";
          }
          break;

        case "plug":
          if (isOn) {
            return "is plugged in";
          }
          if (isOff) {
            return "is unplugged";
          }
          break;

        case "presence":
          if (isOn) {
            return "is at home";
          }
          if (isOff) {
            return "is away";
          }
          break;

        case "safety":
          if (isOn) {
            return "is unsafe";
          }
          if (isOff) {
            return "is safe";
          }
          break;

        case "cold":
        case "gas":
        case "heat":
        case "colightld":
        case "moisture":
        case "motion":
        case "occupancy":
        case "power":
        case "problem":
        case "smoke":
        case "sound":
        case "vibration":
          if (isOn) {
            return `detected ${device_class}`;
          }
          if (isOff) {
            return `cleared (no ${device_class} detected)`;
          }
          break;
      }

      break;
    }
  }

  if (state === STATE_ON) {
    return "turned on";
  }

  if (state === STATE_OFF) {
    return "turned off";
  }

  return `changed to ${state}`;
};
