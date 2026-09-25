export const computeDomain = (entityId: string): string =>
  entityId.substring(0, entityId.indexOf("."));
