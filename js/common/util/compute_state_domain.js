import computeDomain from './compute_domain.js';

export default function computeStateDomain(stateObj) {
  if (!stateObj._domain) {
    stateObj._domain = computeDomain(stateObj.entity_id);
  }

  return stateObj._domain;
}
