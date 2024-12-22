import { HomeAssistant } from "../../types";

/** Return an array of domains with the service. */
export const componentsWithService = (
  hass: HomeAssistant,
  service: string
): Array<string> =>
  hass &&
  Object.keys(hass.services).filter((key) => service in hass.services[key]);
