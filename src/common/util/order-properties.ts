/**
 * Orders object properties according to a specified key order.
 * Properties not in the order array will be placed at the end.
 */
export function orderProperties<T extends Record<string, any>>(
  obj: T,
  keys: readonly string[]
): T {
  const orderedEntries = keys
    .filter((key) => key in obj)
    .map((key) => [key, obj[key]] as const);

  const extraEntries = Object.entries(obj).filter(
    ([key]) => !keys.includes(key)
  );

  return Object.fromEntries([...orderedEntries, ...extraEntries]) as T;
}
