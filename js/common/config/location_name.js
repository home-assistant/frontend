/** Get the location name from a hass object. */
export default function computeLocationName(hass) {
  return hass && hass.config.core.location_name;
}
