import type { HuiSection } from "../sections/hui-section";
import { sectionColumnSpan, sectionsRowEnd } from "./sections-row-layout";

/**
 * Determines which sections without a background need vertical margin
 * to align with adjacent sections that have a background (and padding).
 *
 * Simulates CSS grid row placement by accumulating column spans.
 * For each row, if any section has a background, the sections without
 * a background in that row need margin to compensate for the padding
 * added by the background.
 */
export function computeSectionsBackgroundAlignment(
  sections: HuiSection[],
  columnCount: number
): Set<number> {
  const sectionsNeedingMargin = new Set<number>();

  // Single column layout never has side-by-side sections
  if (columnCount <= 1) return sectionsNeedingMargin;

  const visible = sections.flatMap((section, index) =>
    section.hidden
      ? []
      : [
          {
            index,
            columnSpan: sectionColumnSpan(
              section.config.column_span,
              columnCount
            ),
          },
        ]
  );
  let start = 0;
  while (start < visible.length) {
    const end = sectionsRowEnd(visible, start, columnCount);
    const row = visible.slice(start, end);
    if (
      row.some(({ index }) => sections[index].config.background !== undefined)
    ) {
      for (const { index } of row) {
        if (sections[index].config.background === undefined) {
          sectionsNeedingMargin.add(index);
        }
      }
    }
    start = end;
  }

  return sectionsNeedingMargin;
}
