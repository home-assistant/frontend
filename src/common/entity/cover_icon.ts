/** Return an icon representing a cover state. */
import { HassEntity } from "home-assistant-js-websocket";

export const coverIcon = (state?: string, stateObj?: HassEntity): string => {
  const open = state !== "closed";

  switch (stateObj?.attributes.device_class) {
    case "garage":
      switch (state) {
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
      switch (state) {
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
      switch (state) {
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
    case "shade":
      switch (state) {
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
      switch (state) {
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

  switch (state) {
    case "opening":
      return "hass:arrow-up-box";
    case "closing":
      return "hass:arrow-down-box";
    case "closed":
      return "hass:window-closed";
    default:
      return "hass:window-open";
  }
};

export const computeOpenIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "awning":
    case "door":
    case "gate":
      return "hass:arrow-expand-horizontal";
    default:
      return "hass:arrow-up";
  }
};

export const computeCloseIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "awning":
    case "door":
    case "gate":
      return "hass:arrow-collapse-horizontal";
    default:
      return "hass:arrow-down";
  }
};
