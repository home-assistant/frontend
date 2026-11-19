/**
 * Maps the items with an async function, running at most `limit` calls at a
 * time. The results keep the order of the items. When a call fails, no new
 * calls start and the returned promise rejects with that error.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        // Each worker waits for its call before taking the next item
        // eslint-disable-next-line no-await-in-loop
        results[index] = await fn(items[index], index);
      } catch (err) {
        next = items.length;
        throw err;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker)
  );
  return results;
};
