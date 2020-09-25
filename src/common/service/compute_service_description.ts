import { HomeAssistant } from "../../types";

export const computeServiceDescription = (
  hass: HomeAssistant,
  domain: string,
  service: string
): string | undefined => {
  const serviceDomains = hass.services;
  if (!(domain in serviceDomains)) return undefined;
  if (!(service in serviceDomains[domain])) return undefined;
  return serviceDomains[domain][service].description;
};
