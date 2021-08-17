export const groupBy = <T>(
  list: T[],
  keySelector: (item: T) => string
): { [key: string]: T[] } => {
  const result = {};
  for (const item of list) {
    const key = keySelector(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
};
