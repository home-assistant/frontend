/** Return an icon representing a cover state. */
import { HassEntity } from "home-assistant-js-websocket";
import domainIcon from "./domain_icon";

export default function coverIcon(state: HassEntity): string {
  const open = state.state !== "closed";
  switch (state.attributes.device_class) {
    case "garage":
      return open ? "hass:garage-open" : "hass:garage";
    case "door":
      return open ? "hass:door-open" : "hass:door-closed";
    case "window":
      return open ? "hass:window-open" : "hass:window-closed";
    case "awning":
      return open ? "hass:umbrella-open" : "hass:umbrella-closed";
    default:
      return domainIcon("cover", state.state);
  }
}
