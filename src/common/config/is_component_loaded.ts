import { HomeAssistant } from "../../types";

/** Return if a component is loaded. */
export default function isComponentLoaded(
  hass: HomeAssistant,
  component: string
): boolean {
  return hass && hass.config.components.indexOf(component) !== -1;
}
