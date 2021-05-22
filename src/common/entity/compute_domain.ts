export const computeDomain = (entityId: string): string =>
  entityId.substr(0, entityId.indexOf("."));
