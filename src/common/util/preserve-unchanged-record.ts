/**
 * Records like the entity, device, area and floor registries are re-fetched and
 * rebuilt in full on every registry-updated event, producing brand-new objects
 * for every item even when nothing relevant changed. That gives every item a new
 * reference, so all consumers needlessly re-render.
 *
 * Returns `next` with each item replaced by the equal `previous` item, so
 * unchanged items keep their object identity, and returns the `previous` record
 * untouched when nothing changed at all (so the update can be skipped entirely).
 */
export const preserveUnchangedRecord = <T>(
  previous: Record<string, T> | undefined,
  next: Record<string, T>,
  equal: (a: T, b: T) => boolean,
  compareOrder = false
): Record<string, T> => {
  if (!previous) {
    return next;
  }

  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);

  let changed = previousKeys.length !== nextKeys.length;

  if (!changed && compareOrder) {
    changed = previousKeys.some((key, index) => key !== nextKeys[index]);
  }

  for (const key of nextKeys) {
    const previousItem = previous[key];
    if (previousItem !== undefined && equal(previousItem, next[key])) {
      next[key] = previousItem;
    } else {
      changed = true;
    }
  }
  return changed ? next : previous;
};
