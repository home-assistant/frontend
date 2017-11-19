export default function computeDomain(stateObj) {
  if (!stateObj || !stateObj.entity_id) {
    return null;
  }
  return stateObj.entity_id.substr(0, stateObj.entity_id.indexOf('.'));
}
