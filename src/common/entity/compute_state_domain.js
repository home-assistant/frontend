import computeDomain from './compute_domain.js';

export default function computeStateDomain(stateObj) {
  return computeDomain(stateObj.entity_id)
}
