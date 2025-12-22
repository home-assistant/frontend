/**
 * Executes a synchronous callback within a View Transition if supported, otherwise runs it directly.
 *
 * @param callback - Synchronous function to execute. The callback will be passed a boolean indicating whether the view transition is available.
 * @returns Promise that resolves when the transition completes (or immediately if not supported)
 *
 * @example
 * ```typescript
 * withViewTransition(() => {
 *   this.large = !this.large;
 * });
 * ```
 */
export const withViewTransition = (
  callback: (viewTransitionAvailable: boolean) => void
): Promise<void> => {
  if (!document.startViewTransition) {
    callback(false);
    return Promise.resolve();
  }

  let callbackInvoked = false;

  try {
    // View Transitions require DOM updates to happen synchronously within
    // the callback. Execute the callback immediately (synchronously).
    const transition = document.startViewTransition(() => {
      callbackInvoked = true;
      callback(true);
    });
    return transition.finished;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "View transition failed, falling back to direct execution.",
      err
    );
    // Make sure the callback is invoked exactly once.
    if (!callbackInvoked) {
      callback(false);
      return Promise.resolve();
    }
    return Promise.reject(err);
  }
};
