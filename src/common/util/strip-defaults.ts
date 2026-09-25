/**
 * Return a shallow copy of an object with every key removed whose value is
 * `undefined` or equals that key's default, so a key left at its default
 * (whether absent or explicit) does not count as a difference. A key's default
 * comes from `defaults` when present, otherwise `false`.
 *
 * Non-plain-object values are returned unchanged; only top-level keys are
 * compared.
 */
export const stripDefaults = <T>(
  value: T,
  defaults?: Record<string, unknown>
): T => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const defaultValue = defaults && key in defaults ? defaults[key] : false;
    if (val === undefined || val === defaultValue) {
      continue;
    }
    result[key] = val;
  }
  return result as T;
};
