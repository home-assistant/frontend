export const computeDomain = (entityId: string): string =>
  entityId ? entityId.substr(0, entityId.indexOf(".")) : "";
