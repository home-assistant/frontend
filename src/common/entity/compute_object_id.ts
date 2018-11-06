/** Compute the object ID of a state. */
export default function computeObjectId(entityId: string): string {
  return entityId.substr(entityId.indexOf(".") + 1);
}
