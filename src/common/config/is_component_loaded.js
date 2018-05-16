/** Return if a component is loaded. */
export default function isComponentLoaded(hass, component) {
  return hass && hass.config.core.components.indexOf(component) !== -1;
}
