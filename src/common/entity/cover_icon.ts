/** Return an icon representing a cover state. */
import { HassEntity } from "home-assistant-js-websocket";
import domainIcon from "./domain_icon";

export default function coverIcon(state: HassEntity) {
  const open = state.state !== "closed";
  switch (state.attributes.device_class) {
    case "garage":
      return open ? "hass:garage-open" : "hass:garage";
    default:
      return domainIcon("cover", state.state);
  }
}
