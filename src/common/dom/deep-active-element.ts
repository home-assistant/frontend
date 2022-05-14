export const deepActiveElement = (
  root: DocumentOrShadowRoot = document
): Element | null => {
  if (root.activeElement?.shadowRoot?.activeElement) {
    return deepActiveElement(root.activeElement.shadowRoot);
  }
  return root.activeElement;
};
