/**
 * Add a value to a most recently used list. A value already in the list keeps
 * its position, a new one goes first and the list is capped at `max`.
 * Entries rejected by `isValid` are dropped first, so they don't take up slots.
 * @param list - The current list, anything that is not an array counts as empty
 * @param value - The value to add
 * @param max - The maximum length of the list
 * @param isValid - Optional filter for entries that should be kept
 */
export const addRecent = <T>(
  list: readonly T[] | undefined,
  value: T,
  max: number,
  isValid?: (item: T) => boolean
): T[] => {
  const current = Array.isArray(list)
    ? list.filter((item) => !isValid || isValid(item))
    : [];
  if (current.includes(value)) {
    return current.slice(0, max);
  }
  return [value, ...current].slice(0, max);
};
