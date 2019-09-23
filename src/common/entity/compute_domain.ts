export const computeDomain = (entityId: string): string => {
  return entityId.substr(0, entityId.indexOf("."));
};
