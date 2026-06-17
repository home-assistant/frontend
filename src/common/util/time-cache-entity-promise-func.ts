import type { HomeAssistant } from "../../types";

type ResultCache<T> = Record<string, Promise<T> | undefined>;

// Caches are namespaced by `cacheKey`, then keyed by the caller object (a hass
// slice) through a WeakMap so each cache is released once that object is garbage
// collected.
const caches = new Map<string, WeakMap<object, ResultCache<unknown>>>();

/**
 * Call a function with result caching per entity.
 * @param cacheKey key to namespace the cache
 * @param cacheTime time to cache the results
 * @param func function to fetch the data
 * @param hass Home Assistant object (or slice) the cache is keyed on
 * @param entityId entity to fetch data for
 * @param args extra arguments to pass to the function to fetch the data
 * @returns
 */
export const timeCacheEntityPromiseFunc = async <T>(
  cacheKey: string,
  cacheTime: number,
  func: (
    hass: Pick<HomeAssistant, "callWS" | "hassUrl">,
    entityId: string,
    ...args: any[]
  ) => Promise<T>,
  hass: Pick<HomeAssistant, "callWS" | "hassUrl">,
  entityId: string,
  ...args: any[]
): Promise<T> => {
  let cache: ResultCache<T> | undefined = (hass as any)[cacheKey];

  if (!cache) {
    cache = hass[cacheKey] = {};
  }

  const lastResult = cache[entityId];

  if (lastResult) {
    return lastResult;
  }

  const result = func(hass, entityId, ...args);
  cache[entityId] = result;

  result.then(
    // When successful, set timer to clear cache
    () =>
      setTimeout(() => {
        cache[entityId] = undefined;
      }, cacheTime),
    // On failure, clear cache right away
    () => {
      cache[entityId] = undefined;
    }
  );

  return result;
};
