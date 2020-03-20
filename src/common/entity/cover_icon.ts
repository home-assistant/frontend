/** Return an icon representing a cover state. */
import { HassEntity } from "home-assistant-js-websocket";
import { domainIcon } from "./domain_icon";

export const coverIcon = (state: HassEntity): string => {
  const open = state.state !== "closed";
  const opening = state.state === "opening";
  const closing = state.state === "closing";

  switch (state.attributes.device_class) {
    case "garage":
      return opening
        ? "hass:arrow-up-bold-box"
        : closing
        ? "hass:arrow-down-bold-box"
        : open ?
        "hass:garage-open"
        : "hass:garage";
    case "gate":
      return opening || closing
        ? "hass:gate-arrow-right" :
        open ? "hass:gate-open"
        : "hass:gate";
    case "door":
      return open ? "hass:door-open" : "hass:door-closed";
    case "damper":
      return open ? "hass:circle" : "hass:circle-slice-8";
    case "shutter":
      return open ? "hass:window-shutter-open" : "hass:window-shutter";
    case "blind":
    case "curtain":
      return open
        ? "hass:blinds-open"
        : opening
        ? "hass:arrow-up-bold-outline"
        : closing
        ? "hass:arrow-down-bold-outline"
        : "hass:blinds";
    case "window":
      return open
        ? "hass:window-open"
        : opening
        ? "hass:arrow-up-bold-box-outline"
        : closing
        ? "hass:arrow-down-bold-box-outline"
        : "hass:window-closed";
    default:
      return domainIcon("cover", state.state);
  }
};
