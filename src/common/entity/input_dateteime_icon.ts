/** Return an icon representing an input datetime state. */
import domainIcon from "./domain_icon";
import { HassEntity } from "home-assistant-js-websocket";

export default function inputDateTimeIcon(state: HassEntity): string {
  if (!state.attributes.has_date) {
    return "hass:clock";
  }
  if (!state.attributes.has_time) {
    return "hass:calendar";
  }
  return domainIcon("input_datetime");
}
