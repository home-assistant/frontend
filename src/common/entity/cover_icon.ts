/** Return an icon representing a cover state. */
import domainIcon from "./domain_icon";

export default function coverIcon(state) {
  var open = state.state && state.state !== "closed";
  switch (state.attributes.device_class) {
    case "garage":
      return open ? "hass:garage-open" : "hass:garage";
    default:
      return domainIcon("cover", state.state);
  }
}
