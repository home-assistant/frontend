import { extractDomain } from 'home-assistant-js-websocket';

export default function computeDomain(stateObj) {
  if (!stateObj._domain) {
    stateObj._domain = extractDomain(stateObj.entity_id);
  }

  return stateObj._domain;
}
