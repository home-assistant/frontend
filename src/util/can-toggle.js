import hass from './home-assistant-js-instance';

const {
  reactor,
  serviceGetters,
} = hass;

// Return boolean if entity can be toggled.
export default function canToggle(entityId) {
  return reactor.evaluate(serviceGetters.canToggleEntity(entityId));
}
