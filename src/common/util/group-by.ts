export const groupBy = <T>(
  list: T[],
  keySelector: (item: T) => string
): Record<string, T[]> => {
  // Group in a Map so keys like `constructor` or `__proto__` don't collide
  // with Object.prototype.
  const groups = new Map<string, T[]>();
  for (const item of list) {
    const key = keySelector(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Object.fromEntries(groups);
};
