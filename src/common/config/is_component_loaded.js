/** Return if a component is loaded. */
export default function isComponentLoaded(hass, component) {
  return hass && hass.config.components.indexOf(component) !== -1;
}
