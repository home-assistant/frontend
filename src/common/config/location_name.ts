import { HomeAssistant } from "../../types";

/** Get the location name from a hass object. */
export default function computeLocationName(hass: HomeAssistant): string {
  return hass && hass.config.location_name;
}
