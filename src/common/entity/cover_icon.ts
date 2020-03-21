/** Return an icon representing a cover state. */
import { HassEntity } from "home-assistant-js-websocket";
import { domainIcon } from "./domain_icon";

export const coverIcon = (state: HassEntity): string => {
  const open = state.state !== "closed";

  switch (state.attributes.device_class) {
    case "garage":
      switch (state.state) {
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
      switch (state.state) {
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
      return open ? "hass:window-shutter-open" : "hass:window-shutter";
    case "blind":
    case "curtain":
      switch (state.state) {
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
      switch (state.state) {
        case "opening":
          return "hass:arrow-up-box";
        case "closing":
          return "hass:arrow-down-box";
        case "closed":
          return "hass:window-closed";
        default:
          return "hass:window-open";
      }
    default:
      return domainIcon("cover", state.state);
  }
};
