type NonUndefined<T> = T extends undefined ? never : T;

export function ensureArray(value: undefined): undefined;
export function ensureArray<T>(value: T | T[]): NonUndefined<T>[];
export function ensureArray<T>(value: T | readonly T[]): NonUndefined<T>[];
export function ensureArray(value) {
  if (value === undefined || Array.isArray(value)) {
    return value;
  }
  return [value];
}
