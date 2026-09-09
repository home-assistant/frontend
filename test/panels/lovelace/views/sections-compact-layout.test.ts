import { describe, expect, it } from "vitest";
import { computeCompactLayout } from "../../../../src/panels/lovelace/views/sections-compact-layout";
import type { CompactSection } from "../../../../src/panels/lovelace/views/sections-compact-layout";

const sections = (heights: number[], spans: number[] = []): CompactSection[] =>
  heights.map((height, index) => ({ index, height, columnSpan: spans[index] }));
const membership = (items: CompactSection[], columns = 2, gap = 24) =>
  computeCompactLayout(items, columns, gap)?.map((row) =>
    row.lanes.map((lane) => lane.sectionIndices)
  );

describe("computeCompactLayout", () => {
  it("packs the basic A/C/D example", () => {
    expect(membership(sections([500, 200, 250]))).toEqual([[[0], [1, 2]]]);
  });
  it("starts the next row when the next section does not fit", () => {
    expect(membership(sections([500, 200, 300]))).toEqual([[[0], [1]], [[2]]]);
  });
  it("packs multiple sections without growing the initial capacity", () => {
    const result = computeCompactLayout(
      sections([500, 100, 100, 100, 150]),
      2,
      24
    )!;
    expect(result[0].lanes[1].sectionIndices).toEqual([1, 2, 3]);
    expect(result[0].initialHeight).toBe(500);
    expect(result[0].lanes[1].initialUsedHeight).toBe(348);
    expect(result[1].lanes[0].sectionIndices).toEqual([4]);
  });
  it("requires an exact span match and does not merge adjacent lanes", () => {
    expect(membership(sections([500, 100, 100, 100], [1, 1, 1, 2]), 3)).toEqual(
      [[[0], [1], [2]], [[3]]]
    );
    expect(membership(sections([500, 100, 100], [2, 2, 2]), 4)).toEqual([
      [[0], [1, 2]],
    ]);
  });
  it("tests vertical fit when a span cannot fit the remaining columns", () => {
    expect(membership(sections([500, 100, 100], [1, 2, 2]), 4)).toEqual([
      [[0], [1, 2]],
    ]);
  });
  it("chooses the shortest compatible lane, with leftmost winning ties", () => {
    expect(membership(sections([500, 150, 100, 100]), 3)).toEqual([
      [[0], [1], [2, 3]],
    ]);
    expect(membership(sections([500, 100, 100, 100]), 3)).toEqual([
      [[0], [1, 3], [2]],
    ]);
  });
  it("never skips a candidate or searches an older row", () => {
    expect(membership(sections([500, 200, 600, 100, 100]))).toEqual([
      [[0], [1]],
      [[2], [3, 4]],
    ]);
  });
  it.each([
    [276, true],
    [276.01, false],
  ])("includes the gap at boundary %s", (height, fits) => {
    expect(
      computeCompactLayout(sections([500, 200, height]), 2, 24)?.length
    ).toBe(fits ? 1 : 2);
  });
  it("uses the supplied gap, including zero and fractional pixels", () => {
    expect(membership(sections([500, 200, 300]), 2, 0)).toEqual([
      [[0], [1, 2]],
    ]);
    expect(membership(sections([500, 200, 275.5]), 2, 24.5)).toEqual([
      [[0], [1, 2]],
    ]);
  });
  it("clamps spans to the content column count", () => {
    const result = computeCompactLayout(sections([500, 100], [10, 1]), 2, 24)!;
    expect(result[0].lanes[0].columnSpan).toBe(2);
    expect(result).toHaveLength(2);
  });
  it("falls back for one column and non-default row spans", () => {
    expect(computeCompactLayout(sections([500, 100]), 1, 24)).toBeUndefined();
    for (const rowSpan of [0, 2, 3]) {
      expect(
        computeCompactLayout([{ index: 0, height: 100, rowSpan }], 2, 24)
      ).toBeUndefined();
    }
  });
  it("aligns only actual top-level peers and accounts for their margins", () => {
    const items = sections([500, 200, 100, 250, 200, 100]);
    items[0].hasBackground = true;
    items[1].alignmentMargin = 16;
    // The candidate was aligned in its old native row, but is not a top peer now.
    items[2].alignmentMargin = 16;
    items[3].hasBackground = true;
    items[4].alignmentMargin = 16;
    const result = computeCompactLayout(items, 2, 24)!;
    expect(result[0].alignedSectionIndices).toEqual([1]);
    expect(result[0].lanes[1].initialUsedHeight).toBe(340);
    expect(result[1].alignedSectionIndices).toEqual([4]);
    expect(result[1].lanes[1].initialUsedHeight).toBe(216);
  });
  it("recomputes alignment for rows whose top peers changed during packing", () => {
    const items = sections([500, 100, 100, 400, 100]);
    items[2].hasBackground = true;
    items[3].alignmentMargin = 16;
    const result = computeCompactLayout(items, 2, 24)!;
    expect(result[0].lanes[1].sectionIndices).toEqual([1, 2]);
    expect(result[1].alignedSectionIndices).toEqual([]);
    expect(result[1].initialHeight).toBe(400);
  });
  it("retains initially hidden sections without consuming visible row capacity", () => {
    const items = sections([500, 900, 200, 250]);
    items[1].hidden = true;
    expect(membership(items)).toEqual([[[0], [2, 3]], [[1]]]);
  });
  it("handles no sections and does not mutate its inputs", () => {
    expect(computeCompactLayout([], 4, 24)).toEqual([]);
    const items = Object.freeze(sections([500, 200, 250]).map(Object.freeze));
    expect(membership(items as CompactSection[])).toEqual([[[0], [1, 2]]]);
  });
});
