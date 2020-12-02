export const ensureArray = (value?: any) => {
  if (!value || Array.isArray(value)) {
    return value;
  }
  return [value];
};
