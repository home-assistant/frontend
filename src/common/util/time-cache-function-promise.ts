import { HomeAssistant } from "../../types";

interface ResultCache<T> {
  [entityId: string]: Promise<T> | undefined;
}

export const timeCachePromiseFunc = async <T>(
  cacheKey: string,
  cacheTime: number,
  func: (
    hass: HomeAssistant,
    entityId: string,
    ...args: unknown[]
  ) => Promise<T>,
  hass: HomeAssistant,
  entityId: string,
  ...args: unknown[]
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
        cache![entityId] = undefined;
      }, cacheTime),
    // On failure, clear cache right away
    () => {
      cache![entityId] = undefined;
    }
  );

  return result;
};
