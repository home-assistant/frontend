import computeDomain from "./compute_domain";

export default function computeStateDomain(stateObj) {
  return computeDomain(stateObj.entity_id);
}
