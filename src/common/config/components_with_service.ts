import type { HomeAssistant } from "../../types";
import { isComponentLoaded } from "./is_component_loaded";

/** Return an array of domains with the service. */
export const componentsWithService = (
  hass: HomeAssistant,
  service: string
): string[] =>
  hass &&
  Object.keys(hass.services).filter(
    (domain) =>
      service in hass.services[domain] && isComponentLoaded(hass.config, domain)
  );
