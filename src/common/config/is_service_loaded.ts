import { HomeAssistant } from "../../types";

/** Return if a service is loaded. */
export const isServiceLoaded = (
  hass: HomeAssistant,
  domain: string,
  service: string
): boolean =>
  hass && domain in hass.services && service in hass.services[domain];
