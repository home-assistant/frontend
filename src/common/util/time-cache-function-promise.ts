import { HomeAssistant } from "../../types";

interface CacheResult<T> {
  result: T;
  cacheKey: any;
}

/**
 * Caches a result of a promise for X time. Allows optional extra validation
 * check to invalidate the cache.
 * @param cacheKey the key to store the cache
 * @param cacheTime the time to cache the result
 * @param func the function to fetch the data
 * @param generateCacheKey optional function to generate a cache key based on current hass + cached result. Cache is invalid if generates a different cache key.
 * @param hass Home Assistant object
 * @param args extra arguments to pass to the function to fetch the data
 * @returns
 */
export const timeCachePromiseFunc = async <T>(
  cacheKey: string,
  cacheTime: number,
  func: (hass: HomeAssistant, ...args: any[]) => Promise<T>,
  generateCacheKey:
    | ((hass: HomeAssistant, lastResult: T) => unknown)
    | undefined,
  hass: HomeAssistant,
  ...args: any[]
): Promise<T> => {
  const anyHass = hass as any;
  const lastResult: Promise<CacheResult<T>> | CacheResult<T> | undefined =
    anyHass[cacheKey];

  const checkCachedResult = (result: CacheResult<T>): T | Promise<T> => {
    if (
      !generateCacheKey ||
      generateCacheKey(hass, result.result) === result.cacheKey
    ) {
      return result.result;
    }

    anyHass[cacheKey] = undefined;
    return timeCachePromiseFunc(
      cacheKey,
      cacheTime,
      func,
      generateCacheKey,
      hass,
      ...args
    );
  };

  // If we have a cached result, return it if it's still valid
  if (lastResult) {
    return lastResult instanceof Promise
      ? lastResult.then(checkCachedResult)
      : checkCachedResult(lastResult);
  }

  const resultPromise = func(hass, ...args);
  anyHass[cacheKey] = resultPromise;

  resultPromise.then(
    // When successful, set timer to clear cache
    (result) => {
      anyHass[cacheKey] = {
        result,
        cacheKey: generateCacheKey?.(hass, result),
      };
      setTimeout(() => {
        anyHass[cacheKey] = undefined;
      }, cacheTime);
    },
    // On failure, clear cache right away
    () => {
      anyHass[cacheKey] = undefined;
    }
  );

  return resultPromise;
};
