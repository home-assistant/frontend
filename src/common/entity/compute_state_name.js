import computeObjectId from "./compute_object_id";

export default function computeStateName(stateObj) {
  if (stateObj._entityDisplay === undefined) {
    stateObj._entityDisplay =
      stateObj.attributes.friendly_name ||
      computeObjectId(stateObj.entity_id).replace(/_/g, " ");
  }

  return stateObj._entityDisplay;
}
