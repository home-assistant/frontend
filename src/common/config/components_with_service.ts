import type { HomeAssistant } from "../../types";

/** Return an array of domains with the service. */
export const componentsWithService = (
  hass: HomeAssistant,
  service: string
): string[] =>
  hass &&
  Object.keys(hass.services).filter((key) => service in hass.services[key]);
