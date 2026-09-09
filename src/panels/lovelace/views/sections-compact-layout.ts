import { sectionColumnSpan, sectionsRowEnd } from "./sections-row-layout";

export interface CompactSection {
  index: number;
  columnSpan?: number;
  rowSpan?: number;
  /** Rendered footprint excluding the optional background alignment margins. */
  height: number;
  alignmentMargin?: number;
  hasBackground?: boolean;
  hidden?: boolean;
}

export interface CompactLane {
  columnStart: number;
  columnSpan: number;
  initialUsedHeight: number;
  sectionIndices: number[];
}

export interface CompactRow {
  /** Initial packing capacity only; never used as a CSS height. */
  initialHeight: number;
  lanes: CompactLane[];
  alignedSectionIndices: number[];
}

/**
 * One-row compaction in source order. Only equal-span lanes are compatible.
 * Choose the shortest compatible lane, then the leftmost lane on ties.
 * Never increase a row's initial capacity or backfill an older row.
 * Undefined means the native renderer must handle this configuration.
 */
export function computeCompactLayout(
  sections: readonly CompactSection[],
  columnCount: number,
  rowGap: number
): CompactRow[] | undefined {
  if (columnCount <= 1 || sections.some((s) => (s.rowSpan ?? 1) !== 1)) {
    return undefined;
  }

  const visible = sections
    .filter((section) => !section.hidden)
    .map((section) => ({
      ...section,
      columnSpan: sectionColumnSpan(section.columnSpan, columnCount),
    }));
  const rowsByFirstSection = new Map<number, CompactRow>();
  let next = 0;
  while (next < visible.length) {
    const end = sectionsRowEnd(visible, next, columnCount);
    const top = visible.slice(next, end);
    const hasBackground = top.some((section) => section.hasBackground);
    const row: CompactRow = {
      initialHeight: 0,
      lanes: [],
      alignedSectionIndices: [],
    };
    let columnStart = 1;
    for (const section of top) {
      const aligned = hasBackground && !section.hasBackground;
      const height =
        section.height + (aligned ? (section.alignmentMargin ?? 0) : 0);
      row.lanes.push({
        columnStart,
        columnSpan: section.columnSpan,
        initialUsedHeight: height,
        sectionIndices: [section.index],
      });
      if (aligned) row.alignedSectionIndices.push(section.index);
      columnStart += section.columnSpan;
      row.initialHeight = Math.max(row.initialHeight, height);
    }
    rowsByFirstSection.set(visible[next].index, row);
    next = end;

    while (next < visible.length) {
      const candidate = visible[next];
      let target: CompactLane | undefined;
      for (const lane of row.lanes) {
        if (
          lane.columnSpan === candidate.columnSpan &&
          lane.initialUsedHeight + rowGap + candidate.height <=
            row.initialHeight &&
          (!target || lane.initialUsedHeight < target.initialUsedHeight)
        ) {
          target = lane;
        }
      }
      if (!target) break;
      target.sectionIndices.push(candidate.index);
      target.initialUsedHeight += rowGap + candidate.height;
      next++;
    }
  }

  // Initially hidden sections retain mounted elements and a fixed standalone
  // row. They can become visible without requiring a new packing calculation.
  // Empty rows collapse in CSS. Keep these rows in source order where possible.
  const rows: CompactRow[] = [];
  for (const section of sections) {
    const row = rowsByFirstSection.get(section.index);
    if (row) rows.push(row);
    if (section.hidden) {
      rows.push({
        initialHeight: 0,
        alignedSectionIndices: [],
        lanes: [
          {
            columnStart: 1,
            columnSpan: sectionColumnSpan(section.columnSpan, columnCount),
            initialUsedHeight: 0,
            sectionIndices: [section.index],
          },
        ],
      });
    }
  }
  return rows;
}
