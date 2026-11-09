/**
 * Return a copy of the list with the value in it, without adding duplicates
 * @param values - The current list
 * @param value - The value to add
 */
export const arrayWith = <T>(
  values: readonly T[] | undefined,
  value: T
): T[] => (values?.includes(value) ? [...values] : [...(values ?? []), value]);

/**
 * Return a copy of the list without the value
 * @param values - The current list
 * @param value - The value to remove
 */
export const arrayWithout = <T>(
  values: readonly T[] | undefined,
  value: T
): T[] => (values ?? []).filter((v) => v !== value);
