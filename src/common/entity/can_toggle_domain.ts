import type { HomeAssistant } from "../../types";

export const canToggleDomain = (hass: HomeAssistant, domain: string) => {
  const services = hass.services[domain];
  if (!services) {
    return false;
  }

  if (domain === "button" || domain === "input_button") {
    return "press" in services;
  }
  if (domain === "lock") {
    return "lock" in services;
  }
  if (domain === "cover") {
    return "open_cover" in services;
  }
  if (domain === "valve") {
    return "open_valve" in services;
  }
  return "turn_on" in services;
};
