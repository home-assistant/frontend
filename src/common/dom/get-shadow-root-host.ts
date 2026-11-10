export const getShadowRootHost = (element: Node): HTMLElement | null => {
  const root = element.getRootNode();

  return root instanceof ShadowRoot && root.host instanceof HTMLElement
    ? root.host
    : null;
};
