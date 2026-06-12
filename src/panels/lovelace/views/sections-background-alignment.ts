import type { HuiSection } from "../sections/hui-section";

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

  // Group visible sections into rows by accumulating column spans
  const rows: { indices: number[]; hasBackground: boolean }[] = [];
  let currentRow = { indices: [] as number[], hasBackground: false };
  let columnsUsed = 0;

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx];
    if (section.hidden) continue;

    const span = Math.min(section.config.column_span || 1, columnCount);

    // Start a new row if this section doesn't fit
    if (columnsUsed + span > columnCount) {
      rows.push(currentRow);
      currentRow = { indices: [], hasBackground: false };
      columnsUsed = 0;
    }

    columnsUsed += span;
    currentRow.indices.push(idx);

    if (section.config.background !== undefined) {
      currentRow.hasBackground = true;
    }
  }
  rows.push(currentRow);

  // Mark sections without background in rows that contain a background section
  for (const row of rows) {
    if (!row.hasBackground) continue;
    for (const idx of row.indices) {
      if (sections[idx].config.background === undefined) {
        sectionsNeedingMargin.add(idx);
      }
    }
  }

  return sectionsNeedingMargin;
}
