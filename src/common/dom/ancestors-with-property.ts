const DEFAULT_OWN = true;

// Finds the closest ancestor of an element that has a specific optionally owned property,
// traversing slot and shadow root boundaries until the body element is reached
export const closestWithProperty = (
  element: Element | null,
  property: string | symbol,
  own = DEFAULT_OWN
) => {
  if (!element || element === document.body) return null;

  element = element.assignedSlot ?? element;
  if (element.parentElement) {
    element = element.parentElement;
  } else {
    const root = element.getRootNode();
    element = root instanceof ShadowRoot ? root.host : null;
  }

  if (
    own
      ? Object.prototype.hasOwnProperty.call(element, property)
      : element && property in element
  )
    return element;
  return closestWithProperty(element, property, own);
};

// Finds the set of all such ancestors and includes starting element as first in the set
export const ancestorsWithProperty = (
  element: Element | null,
  property: string | symbol,
  own = DEFAULT_OWN
) => {
  const ancestors: Set<Element> = new Set();
  while (element) {
    ancestors.add(element);
    element = closestWithProperty(element, property, own);
  }
  return ancestors;
};
