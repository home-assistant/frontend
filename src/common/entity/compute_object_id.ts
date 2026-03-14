/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string =>
  entityId.slice(entityId.indexOf(".") + 1);
