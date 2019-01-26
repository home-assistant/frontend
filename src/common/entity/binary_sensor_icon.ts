import { HassEntity } from "home-assistant-js-websocket";

/** Return an icon representing a binary sensor state. */

export default function binarySensorIcon(state: HassEntity) {
  const activated = state.state && state.state === "off";
  switch (state.attributes.device_class) {
    case "battery":
      return activated ? "hass:battery" : "hass:battery-outline";
    case "cold":
      return activated ? "hass:thermometer" : "hass:snowflake";
    case "connectivity":
      return activated ? "hass:server-network-off" : "hass:server-network";
    case "door":
      return activated ? "hass:door-closed" : "hass:door-open";
    case "garage_door":
      return activated ? "hass:garage" : "hass:garage-open";
    case "gas":
    case "power":
    case "problem":
    case "safety":
    case "smoke":
      return activated ? "hass:shield-check" : "hass:alert";
    case "heat":
      return activated ? "hass:thermometer" : "hass:fire";
    case "light":
      return activated ? "hass:brightness-5" : "hass:brightness-7";
    case "lock":
      return activated ? "hass:lock" : "hass:lock-open";
    case "moisture":
      return activated ? "hass:water-off" : "hass:water";
    case "motion":
      return activated ? "hass:walk" : "hass:run";
    case "occupancy":
      return activated ? "hass:home-outline" : "hass:home";
    case "opening":
      return activated ? "hass:square" : "hass:square-outline";
    case "plug":
      return activated ? "hass:power-plug-off" : "hass:power-plug";
    case "presence":
      return activated ? "hass:home-outline" : "hass:home";
    case "sound":
      return activated ? "hass:music-note-off" : "hass:music-note";
    case "vibration":
      return activated ? "hass:crop-portrait" : "hass:vibrate";
    case "window":
      return activated ? "hass:window-closed" : "hass:window-open";
    default:
      return activated ? "hass:radiobox-blank" : "hass:checkbox-marked-circle";
  }
}
