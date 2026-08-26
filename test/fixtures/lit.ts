/** Wait a macrotask so async work started by a lifecycle hook settles. */
export const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/**
 * Simulate the router re-pointing a reused editor element at another item:
 * set the property, then invoke the lifecycle hook with the old value the
 * way Lit would after an update.
 */
export const runUpdated = (el: any, changed: Record<string, unknown>) => {
  el.updated(new Map(Object.entries(changed)));
};
