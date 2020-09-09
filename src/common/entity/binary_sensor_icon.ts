import { HassEntity } from "home-assistant-js-websocket";

/** Return an icon representing a binary sensor state. */

export const binarySensorIcon = (state: HassEntity) => {
  const is_off = state.state && state.state === "off";
  switch (state.attributes.device_class) {
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
};
