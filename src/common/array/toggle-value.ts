/**
 * Add a value to or remove it from a list, without duplicates
 * @param values - The current list
 * @param value - The value to add or remove
 * @param include - Whether the value should be in the returned list
 */
export const toggleValue = <T>(
  values: readonly T[] | undefined,
  value: T,
  include: boolean
): T[] => {
  const result = (values ?? []).filter((v) => v !== value);
  if (include) {
    result.push(value);
  }
  return result;
};
