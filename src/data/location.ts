import type { HomeAssistant } from "../types";

// Domains of the integrations that serve the home location, each with the
// regions it serves that contain the home location
export type LocationIntegrations = Record<string, string[]>;

export const fetchLocationIntegrations = (hass: HomeAssistant) =>
  hass.callWS<LocationIntegrations>({ type: "location/integrations" });
