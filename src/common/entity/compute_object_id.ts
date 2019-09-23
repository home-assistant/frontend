/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string => {
  return entityId.substr(entityId.indexOf(".") + 1);
};
