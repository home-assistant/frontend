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
  /** Height at initialization only; never used as a CSS height. */
  initialHeight: number;
  lanes: CompactLane[];
  alignedSectionIndices: number[];
}

interface SectionGroup {
  columnSpan: number;
  sections: CompactSection[];
}

/** Lay out consecutive groups as the native, non-dense grid would. */
function arrangeGroups(
  groups: SectionGroup[],
  columnCount: number,
  rowGap: number
) {
  const rows: CompactRow[] = [];
  const positions = new Map<
    SectionGroup,
    { row: CompactRow; lane: CompactLane }
  >();
  let next = 0;
  while (next < groups.length) {
    // Hidden sections retain their source position and stop compaction across
    // that position. Their standalone rows collapse until they become visible.
    const hidden = Boolean(groups[next].sections[0].hidden);
    let end = hidden ? next + 1 : sectionsRowEnd(groups, next, columnCount);
    for (let index = next + 1; index < end; index++) {
      if (groups[index].sections[0].hidden) {
        end = index;
        break;
      }
    }
    const peers = groups.slice(next, end);
    const hasBackground = peers.some(
      (group) => group.sections[0].hasBackground
    );
    const row: CompactRow = {
      initialHeight: 0,
      lanes: [],
      alignedSectionIndices: [],
    };
    let columnStart = 1;
    for (const group of peers) {
      const first = group.sections[0];
      const aligned = !hidden && hasBackground && !first.hasBackground;
      const height = hidden
        ? 0
        : group.sections.reduce((total, section) => total + section.height, 0) +
          rowGap * (group.sections.length - 1) +
          (aligned ? (first.alignmentMargin ?? 0) : 0);
      const lane: CompactLane = {
        columnStart,
        columnSpan: group.columnSpan,
        initialUsedHeight: height,
        sectionIndices: group.sections.map((section) => section.index),
      };
      row.lanes.push(lane);
      positions.set(group, { row, lane });
      if (aligned) row.alignedSectionIndices.push(first.index);
      columnStart += group.columnSpan;
      row.initialHeight = Math.max(row.initialHeight, height);
    }
    rows.push(row);
    next = end;
  }
  return { rows, positions };
}

/**
 * Walk sections from the second onward, testing only the immediate predecessor.
 * After each merge, shift the remaining groups through the grid before testing
 * the next section, so every fit uses the fully condensed layout so far.
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

  const groups: SectionGroup[] = sections.map((section) => ({
    columnSpan: sectionColumnSpan(section.columnSpan, columnCount),
    sections: [section],
  }));
  let layout = arrangeGroups(groups, columnCount, rowGap);
  let next = 1;
  while (next < groups.length) {
    const previous = groups[next - 1];
    const candidate = groups[next];
    const section = candidate.sections[0];
    const { row, lane } = layout.positions.get(previous)!;
    if (
      previous.sections[0].hidden ||
      section.hidden ||
      previous.columnSpan !== candidate.columnSpan ||
      lane.initialUsedHeight + rowGap + section.height > row.initialHeight
    ) {
      next++;
      continue;
    }
    previous.sections.push(section);
    groups.splice(next, 1);
    layout = arrangeGroups(groups, columnCount, rowGap);
  }
  return layout.rows;
}
