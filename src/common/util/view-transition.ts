let isViewTransitionDisabled = false;
try {
  isViewTransitionDisabled =
    window.localStorage.getItem("disableViewTransition") === "true";
} catch {
  // ignore
}

export const setViewTransitionDisabled = (disabled: boolean): void => {
  isViewTransitionDisabled = disabled;
};

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException
    ? err.name === "AbortError"
    : err instanceof Error && err.name === "AbortError";

const ignoreAbortError = (err: unknown): void => {
  if (!isAbortError(err)) {
    throw err;
  }
};

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
  if (!document.startViewTransition || isViewTransitionDisabled) {
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
    transition.ready.catch(ignoreAbortError);
    return transition.finished.catch(ignoreAbortError);
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
