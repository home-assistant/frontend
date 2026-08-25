const inFlightRequests = new WeakMap<object, Map<string, Promise<unknown>>>();

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

  const request = fetcher().finally(() => {
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
