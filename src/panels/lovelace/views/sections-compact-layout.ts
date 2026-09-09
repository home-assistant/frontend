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
 * One-row compaction in source order. A section can only stack below its
 * immediate predecessor, in the final lane, with the same column span.
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

  const normalized = sections.map((section) => ({
    ...section,
    columnSpan: sectionColumnSpan(section.columnSpan, columnCount),
  }));
  const rows: CompactRow[] = [];
  let next = 0;
  while (next < normalized.length) {
    const first = normalized[next];
    if (first.hidden) {
      // Keep hidden sections mounted at their source position. This collapsed
      // row is a boundary: later sections must not jump ahead when it appears.
      rows.push({
        initialHeight: 0,
        alignedSectionIndices: [],
        lanes: [
          {
            columnStart: 1,
            columnSpan: first.columnSpan,
            initialUsedHeight: 0,
            sectionIndices: [first.index],
          },
        ],
      });
      next++;
      continue;
    }
    let end = sectionsRowEnd(normalized, next, columnCount);
    for (let index = next; index < end; index++) {
      if (normalized[index].hidden) {
        end = index;
        break;
      }
    }
    const top = normalized.slice(next, end);
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
    rows.push(row);
    next = end;

    const target = row.lanes[row.lanes.length - 1];
    while (next < normalized.length) {
      const candidate = normalized[next];
      if (
        candidate.hidden ||
        target.columnSpan !== candidate.columnSpan ||
        target.initialUsedHeight + rowGap + candidate.height > row.initialHeight
      ) {
        break;
      }
      target.sectionIndices.push(candidate.index);
      target.initialUsedHeight += rowGap + candidate.height;
      next++;
    }
  }

  return rows;
}
