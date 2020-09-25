import { HomeAssistant, ServiceAttribute } from "../../types";

export const computeServiceAttributes = (
  hass: HomeAssistant,
  domain: string,
  service: string
): ServiceAttribute[] => {
  const serviceDomains = hass.services;
  if (!(domain in serviceDomains)) return [];
  if (!(service in serviceDomains[domain])) return [];

  const fields = serviceDomains[domain][service].fields;
  return Object.keys(fields).map(function (field) {
    return { key: field, ...fields[field] };
  });
};
