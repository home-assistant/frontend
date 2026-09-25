const validEntityId = /^(\w+)\.(\w+)$/;

export const isValidEntityId = (entityId: string) =>
  validEntityId.test(entityId);
