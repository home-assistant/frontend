/**
 * Memoizes a single-argument function keyed by its argument's object identity,
 * caching results in a `WeakMap`.
 *
 * Unlike `memoizeOne`, this keeps every distinct argument cached, not just the
 * most recent one. That suits pure derivations from stable config objects that
 * are evaluated for many different configs and on a hot path, e.g. card
 * `shouldUpdate` helpers running on every state change. Entries are garbage
 * collected once the key object is no longer referenced.
 */
export const weakMemoize = <K extends object, V>(
  func: (arg: K) => V
): ((arg: K) => V) => {
  const cache = new WeakMap<K, V>();
  return (arg) => {
    if (!cache.has(arg)) {
      cache.set(arg, func(arg));
    }
    return cache.get(arg)!;
  };
};
