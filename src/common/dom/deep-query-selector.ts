/**
 * Recursively searches for an element matching the selector through shadow DOM boundaries.
 * Similar to querySelector but traverses into shadow roots.
 *
 * @param selector - CSS selector to match
 * @param root - Root element or shadow root to start searching from
 * @returns The first matching element, or null if none found
 */
export const deepQuerySelector = async (
  selector: string,
  root: Element | ShadowRoot | DocumentFragment
): Promise<HTMLElement | null> => {
  const match = root.querySelector(selector) as HTMLElement | null;
  if (match) return match;

  for (const el of root.querySelectorAll("*")) {
    if (el.shadowRoot) {
      // eslint-disable-next-line no-await-in-loop
      const found = await deepQuerySelector(selector, el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
};
