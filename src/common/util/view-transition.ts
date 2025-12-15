/**
 * Executes a callback within a View Transition if supported, otherwise runs it directly.
 *
 * @param callback - Function to execute. Can be synchronous or return a Promise. The callback will be passed a boolean indicating whether the view transition is available.
 * @returns Promise that resolves when the transition completes (or immediately if not supported)
 *
 * @example
 * ```typescript
 * // Synchronous callback
 * withViewTransition(() => {
 *   this.large = !this.large;
 * });
 *
 * // Async callback
 * await withViewTransition(async () => {
 *   await this.updateData();
 * });
 * ```
 */
export const withViewTransition = (
  callback: (viewTransitionAvailable: boolean) => void | Promise<void>
): Promise<void> => {
  // Ensure the callback is invoked exactly once and awaited, even if
  // view transitions are unavailable or throw.
  const runCallback = async (viewTransitionAvailable: boolean) => {
    const result = callback(viewTransitionAvailable);
    await (result instanceof Promise ? result : Promise.resolve());
  };

  if (!document.startViewTransition) {
    return runCallback(false);
  }

  let invoked = false;

  try {
    const transition = document.startViewTransition(() => {
      invoked = true;
      return runCallback(true);
    });
    return transition.finished;
  } catch (err) {
    if (!invoked) {
      return runCallback(false);
    }
    // Callback already ran; surface the original error.
    return Promise.reject(err);
  }
};
