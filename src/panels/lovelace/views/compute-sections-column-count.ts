/**
 * Allow a column a few pixels under --column-min-width rather than dropping
 * it. Subtracting wrapper padding (#53515) made 1080px viewports 8px short of
 * the 3-column threshold, so span-2/3 sections stacked as a single column.
 * 16px also covers a typical scrollbar without undoing 1-column sidebar
 * stacking below ~720px.
 */
export const SECTION_COLUMN_FIT_TOLERANCE_PX = 16;

export const parseCssPx = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const computeSectionsColumnCount = (
  totalWidth: number,
  padding: number,
  minColumnWidth: number,
  columnGap: number
): number => {
  if (totalWidth <= 0) {
    return 1;
  }
  const columns = Math.floor(
    (totalWidth - padding + columnGap + SECTION_COLUMN_FIT_TOLERANCE_PX) /
      (minColumnWidth + columnGap)
  );
  return Math.max(1, columns);
};
