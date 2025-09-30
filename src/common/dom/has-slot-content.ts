/**
 * Check if a slot has any assigned content
 * @param slot - The HTMLSlotElement to check
 * @returns true if the slot has any assigned nodes
 */
export const hasSlotContent = (slot: HTMLSlotElement | null): boolean =>
  slot ? slot.assignedNodes({ flatten: true }).length > 0 : false;
