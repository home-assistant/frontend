import type { Connection } from "home-assistant-js-websocket";

/** Duck-typed shape of a `getCollection()` result cached on a `Connection`. */
interface CachedCollection {
  refresh: () => Promise<unknown>;
  subscribe: (subscriber: (state: any) => void) => () => void;
}

const isCachedCollection = (value: unknown): value is CachedCollection =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as CachedCollection).subscribe === "function" &&
  typeof (value as CachedCollection).refresh === "function";

/**
 * Drop the websocket collections that were created by this window from the
 * shared connection cache.
 *
 * `getCollection()` caches collections (entity registry, label registry, ...) on
 * the `Connection` object. A custom panel embedded in an iframe shares the
 * connection with the main window, so a collection the panel is the first to
 * request is created inside the iframe's realm. When the iframe is removed, that
 * realm is destroyed while the collection stays cached on the connection - its
 * store, and the timer that hands the cached state to new subscribers, are gone.
 * Every later subscriber (the main frontend or the next instance of the panel)
 * then waits forever for a callback that can never fire.
 *
 * Must be called from the realm that is going away - `instanceof Function` is
 * realm-specific and only matches collections created by this window.
 */
export const dropRealmCollections = (connection: Connection): void => {
  // `getCollection()` stores collections on the connection under keys that are
  // not part of its type, so treat it as the bag of properties it is.
  const cache = connection as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(cache)) {
    if (isCachedCollection(value) && value.subscribe instanceof Function) {
      delete cache[key];
    }
  }
};
