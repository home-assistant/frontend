import { HomeAssistant } from "../../types";

/** Return if a component is loaded. */
export const isComponentLoaded = (
  hass: HomeAssistant,
  component: string
): boolean => hass && hass.config.components.includes(component);
