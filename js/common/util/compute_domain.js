export default function computeDomain(stateObj) {
  if (!stateObj._domain) {
    stateObj._domain = stateObj.entity_id.substr(0, stateObj.entity_id.indexOf('.'));
  }

  return stateObj._domain;
}
