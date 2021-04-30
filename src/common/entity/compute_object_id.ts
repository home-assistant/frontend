/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string =>
  entityId.substr(entityId.indexOf(".") + 1);
