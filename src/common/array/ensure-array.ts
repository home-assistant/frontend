type NonUndefined<T> = T extends undefined ? never : T;

/**
 * Ensure that the input is an array or wrap it in an array
 * @param value - The value to ensure is an array
 */
export function ensureArray(value: undefined): undefined;
export function ensureArray<T>(value: T | T[]): NonUndefined<T>[];
export function ensureArray<T>(value: T | readonly T[]): NonUndefined<T>[];
export function ensureArray(value) {
  if (value === undefined || Array.isArray(value)) {
    return value;
  }
  return [value];
}
