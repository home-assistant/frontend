// Return boolean if entity can be toggled.
export default function canToggle(hass, entityId) {
  return hass.reactor.evaluate(hass.serviceGetters.canToggleEntity(entityId));
}
