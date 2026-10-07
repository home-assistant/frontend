const parentInFlatTree = (element: Element): Element | null => {
  if (element.assignedSlot) {
    return element.assignedSlot;
  }
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

const scrollContainer = (element: Element): Element | null => {
  for (
    let parent = parentInFlatTree(element);
    parent;
    parent = parentInFlatTree(parent)
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
  }
  return null;
};

/**
 * Brings a row into the part of the editor that is visible above the bottom
 * sheet, which covers as much as the row's scroll-margin-bottom. A row already
 * there stays put; otherwise it is centered there, or aligned to the top when
 * it is taller than that space.
 */
export const scrollRowIntoView = (row: HTMLElement) => {
  const container = scrollContainer(row)?.getBoundingClientRect() ?? {
    top: 0,
    bottom: window.innerHeight,
  };
  const style = getComputedStyle(row);
  const visibleTop = container.top + parseFloat(style.scrollMarginTop);
  const visibleBottom = container.bottom - parseFloat(style.scrollMarginBottom);
  const { top, bottom } = row.getBoundingClientRect();
  if (top >= visibleTop && bottom <= visibleBottom) {
    return;
  }
  row.scrollIntoView({
    block: bottom - top > visibleBottom - visibleTop ? "start" : "center",
    behavior: "smooth",
  });
};
