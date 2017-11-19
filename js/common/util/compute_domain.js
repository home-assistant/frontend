export default function computeDomain(stateObj) {
  return stateObj.entity_id.substr(0, stateObj.entity_id.indexOf('.'));
}
