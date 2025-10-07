/**
 * Trigger a view transition if supported by the browser
 * @param updateCallback - Callback function that updates the DOM
 * @returns Promise that resolves when the transition is complete
 */
export const startViewTransition = async (
  updateCallback: () => void | Promise<void>
): Promise<void> => {
  // Check if View Transitions API is supported
  if (
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    // Fallback: just run the update without transition
    await updateCallback();
    return;
  }

  // Start the view transition
  const transition = document.startViewTransition(async () => {
    await updateCallback();
  });

  try {
    await transition.finished;
  } catch (error) {
    // Transitions can be skipped, which is fine
    // eslint-disable-next-line no-console
    console.debug("View transition skipped or failed:", error);
  }
};

/**
 * Helper to apply view transition on first render
 * @param _element - The element to observe (unused, kept for API consistency)
 * @param callback - Callback when element is first rendered
 */
export const applyViewTransitionOnLoad = (
  _element: HTMLElement,
  callback?: () => void
): void => {
  if (!document.startViewTransition) {
    callback?.();
    return;
  }

  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    startViewTransition(() => {
      callback?.();
    });
  });
};
