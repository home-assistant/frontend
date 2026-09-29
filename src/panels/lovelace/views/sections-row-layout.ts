/** The native Sections grid clamps a section to the available columns. */
export const sectionColumnSpan = (span: number | undefined, columns: number) =>
  Math.min(span || 1, columns);

/** End (exclusive) of the next source-order, non-dense native grid row. */
export function sectionsRowEnd(
  sections: readonly { columnSpan: number }[],
  start: number,
  columns: number
): number {
  let used = 0;
  let end = start;
  while (end < sections.length && used + sections[end].columnSpan <= columns) {
    used += sections[end].columnSpan;
    end++;
  }
  return end;
}
