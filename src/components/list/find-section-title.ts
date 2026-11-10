/**
 * Find the title of the section the first visible row belongs to, in a list
 * where section headers are plain strings followed by their items.
 *
 * Returns undefined while a header is the first visible row, or the next one
 * is about to scroll into its place, so a sticky title does not overlap it.
 * @param items - The list rows, with headers as strings
 * @param firstVisible - Index of the first visible row
 */
export const findSectionTitle = (
  items: readonly unknown[],
  firstVisible: number
): string | undefined => {
  if (
    items[firstVisible] === undefined ||
    typeof items[firstVisible] === "string" ||
    typeof items[firstVisible + 1] === "string"
  ) {
    return undefined;
  }
  for (let i = firstVisible - 1; i >= 0; i--) {
    const item = items[i];
    if (typeof item === "string") {
      return item;
    }
  }
  return undefined;
};
