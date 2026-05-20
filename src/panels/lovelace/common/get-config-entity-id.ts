export const getConfigEntityId = (
  config: Record<string, any> | undefined | null
): string | undefined => {
  const entity = config?.entity;
  return typeof entity === "string" ? entity : undefined;
};
