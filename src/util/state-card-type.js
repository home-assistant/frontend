import { reactor, serviceGetters } from 'home-assistant-js';

const DOMAINS_WITH_CARD = [
  'thermostat', 'configurator', 'scene', 'media_player'];

export default function stateCardType(state) {
  if (DOMAINS_WITH_CARD.indexOf(state.domain) !== -1) {
    return state.domain;
  } else if (reactor.evaluate(serviceGetters.canToggle(state.entityId))) {
    return 'toggle';
  }
  return 'display';
}
