/** Compute the object ID of a state. */
export default function computeObjectId(entityId) {
  return entityId.substr(entityId.indexOf(".") + 1);
}
