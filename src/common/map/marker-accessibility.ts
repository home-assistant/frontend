/**
 * Marker elements may be focusable buttons on both engines, so the caller's
 * element is the keyboard target and needs a name and a role. MapLibre would
 * otherwise label it "Map marker".
 *
 * What the engine sets is recorded on the element, so a rebuilt marker on a
 * reused element gets fresh attributes while the caller's own are left alone.
 */

const OWNED = "haMapA11y";

export const setMarkerAccessibility = (
  element: HTMLElement,
  title: string | undefined,
  focusable: boolean
): void => {
  clearMarkerAccessibility(element);
  const owned: string[] = [];
  if (
    title &&
    !element.hasAttribute("aria-label") &&
    !element.hasAttribute("aria-labelledby")
  ) {
    element.setAttribute("aria-label", title);
    owned.push("aria-label");
  }
  if (!element.hasAttribute("role")) {
    if (focusable) {
      element.setAttribute("role", "button");
      owned.push("role");
    } else if (title) {
      element.setAttribute("role", "img");
      owned.push("role");
    } else {
      element.setAttribute("aria-hidden", "true");
      owned.push("aria-hidden");
    }
  }
  if (focusable && !element.hasAttribute("tabindex")) {
    element.tabIndex = 0;
    owned.push("tabindex");
  }
  element.dataset[OWNED] = owned.join(" ");
};

/** Removes what setMarkerAccessibility set on the element */
export const clearMarkerAccessibility = (element: HTMLElement): void => {
  const owned = element.dataset[OWNED];
  if (owned === undefined) {
    return;
  }
  owned
    .split(" ")
    .filter(Boolean)
    .forEach((name) => element.removeAttribute(name));
  delete element.dataset[OWNED];
};
