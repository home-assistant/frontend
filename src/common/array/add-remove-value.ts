/**
 * Add a value to a list, unless it is already in it
 * @param values - The current list
 * @param value - The value to add
 */
export const addValue = <T>(values: readonly T[] | undefined, value: T): T[] =>
  values?.includes(value) ? [...values] : [...(values ?? []), value];

/**
 * Remove a value from a list
 * @param values - The current list
 * @param value - The value to remove
 */
export const removeValue = <T>(
  values: readonly T[] | undefined,
  value: T
): T[] => (values ?? []).filter((v) => v !== value);
