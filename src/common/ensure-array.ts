export function ensureArray(value: undefined): undefined;
export function ensureArray<T>(value: T | T[]): T[];
export function ensureArray(value) {
  if (value === undefined || Array.isArray(value)) {
    return value;
  }
  return [value];
}
