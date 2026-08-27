const inFlightRequests = new WeakMap<object, Map<string, Promise<unknown>>>();

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.getOwnPropertyNames(value)) {
    const property = (value as Record<string, unknown>)[key];
    if (
      property !== null &&
      typeof property === "object" &&
      !Object.isFrozen(property)
    ) {
      deepFreeze(property);
    }
  }

  return value;
};

export const shareInFlightRequest = <T>(
  owner: object,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  let requests = inFlightRequests.get(owner);
  if (!requests) {
    requests = new Map();
    inFlightRequests.set(owner, requests);
  }

  const ownerRequests = requests;
  const existing = ownerRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = fetcher()
    .then((result) => deepFreeze(result))
    .finally(() => {
      if (ownerRequests.get(key) !== request) {
        return;
      }

      ownerRequests.delete(key);
      if (ownerRequests.size === 0) {
        inFlightRequests.delete(owner);
      }
    });

  ownerRequests.set(key, request);
  return request;
};
