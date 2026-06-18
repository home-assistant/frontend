/**
 * Return a shallow copy of an object with every key whose value is `false` or
 * `undefined` removed, so that an absent key and an explicit `false` compare as
 * equal. Non-plain-object values (primitives, arrays, `null`) are returned
 * unchanged.
 *
 * Used to derive an "effective" comparison where a toggle left at its
 * off-default (e.g. `show_entity_picture: false`) is treated the same as the
 * key being absent.
 */
export const stripToggleDefaults = <T>(value: T): T => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === false || val === undefined) {
      continue;
    }
    result[key] = val;
  }
  return result as T;
};
