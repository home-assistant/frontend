export const ensureArray = <T>(value: T | T[]): T[] => {
  if (!value || Array.isArray(value)) {
    return value as T[];
  }
  return [value];
};
