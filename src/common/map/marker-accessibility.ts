/**
 * Marker elements are focusable buttons on both engines, so the caller's
 * element is the keyboard target and needs a name and a role. MapLibre would
 * otherwise label it "Map marker".
 */
export const setMarkerAccessibility = (
  element: HTMLElement,
  title: string | undefined,
  interactive: boolean
): void => {
  if (title && !element.hasAttribute("aria-label")) {
    element.setAttribute("aria-label", title);
  }
  if (!element.hasAttribute("role")) {
    if (interactive) {
      element.setAttribute("role", "button");
    } else if (title) {
      element.setAttribute("role", "img");
    } else {
      element.setAttribute("aria-hidden", "true");
    }
  }
};
