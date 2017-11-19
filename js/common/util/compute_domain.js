import { extractDomain } from 'home-assistant-js-websocket';

export default function computeDomain(stateObj) {
  return extractDomain(stateObj.entity_id);
}
