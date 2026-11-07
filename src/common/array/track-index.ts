/**
 * Index of the same item after another item moved from `oldIndex` to
 * `newIndex`, as done with splice by drag and drop lists.
 */
export const indexAfterMove = (
  index: number,
  oldIndex: number,
  newIndex: number
): number => {
  if (index === oldIndex) {
    return newIndex;
  }
  if (oldIndex < index && newIndex >= index) {
    return index - 1;
  }
  if (oldIndex > index && newIndex <= index) {
    return index + 1;
  }
  return index;
};

/**
 * Index of the same item after the item at `removedIndex` was removed, or
 * undefined when it was the removed item.
 */
export const indexAfterRemove = (
  index: number,
  removedIndex: number
): number | undefined => {
  if (index === removedIndex) {
    return undefined;
  }
  return index > removedIndex ? index - 1 : index;
};
