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
  if (document.startViewTransition) {
    return document.startViewTransition(() => callback(true)).finished;
  }

  // Fallback: Execute callback directly without transition
  const result = callback(false);
  return result instanceof Promise ? result : Promise.resolve();
};
