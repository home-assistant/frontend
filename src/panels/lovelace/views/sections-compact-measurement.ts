/** Read the footprint of the inner container, not its stretched grid cell. */
export function measureSectionFootprint(element: HTMLElement) {
  const style = getComputedStyle(element);
  const margin =
    (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
  return { height: element.getBoundingClientRect().height + margin, margin };
}
