/** Whether the slot of a `slotchange` event has elements assigned. */
export const hasAssignedElements = (ev: Event): boolean =>
  (ev.target as HTMLSlotElement).assignedElements().length > 0;

/**
 * Whether the slot of a `slotchange` event has content assigned: elements or
 * text. Whitespace between tags is not content.
 */
export const hasAssignedContent = (ev: Event): boolean =>
  (ev.target as HTMLSlotElement)
    .assignedNodes()
    .some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE || Boolean(node.textContent?.trim())
    );
