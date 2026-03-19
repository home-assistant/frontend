import { describe, expect, it } from "vitest";
import type { HuiSection } from "../../../../src/panels/lovelace/sections/hui-section";
import { computeSectionsBackgroundAlignment } from "../../../../src/panels/lovelace/views/sections-background-alignment";

function mockSection(
  opts: {
    background?: {};
    column_span?: number;
    hidden?: boolean;
  } = {}
): HuiSection {
  return {
    hidden: opts.hidden ?? false,
    config: {
      background: opts.background,
      column_span: opts.column_span,
    },
  } as unknown as HuiSection;
}

describe("computeSectionsBackgroundAlignment", () => {
  it("returns empty set for single column layout", () => {
    const sections = [mockSection(), mockSection({ background: {} })];
    const result = computeSectionsBackgroundAlignment(sections, 1);
    expect(result.size).toBe(0);
  });

  it("returns empty set when no sections have background", () => {
    const sections = [mockSection(), mockSection(), mockSection()];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.size).toBe(0);
  });

  it("returns empty set when all sections have background", () => {
    const sections = [
      mockSection({ background: {} }),
      mockSection({ background: {} }),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.size).toBe(0);
  });

  it("marks section without background on same row as one with background", () => {
    const sections = [mockSection(), mockSection({ background: {} })];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.has(0)).toBe(true);
    expect(result.has(1)).toBe(false);
  });

  it("does not mark sections on different rows", () => {
    // Row 1: section 0 (no bg), Row 2: section 1 (bg)
    const sections = [mockSection(), mockSection({ background: {} })];
    const result = computeSectionsBackgroundAlignment(sections, 1);
    expect(result.size).toBe(0);
  });

  it("handles column_span correctly", () => {
    // 4 columns: section 0 (span 2, no bg) + section 1 (span 2, bg) = row 1
    // section 2 (span 1, no bg) = row 2
    const sections = [
      mockSection({ column_span: 2 }),
      mockSection({ column_span: 2, background: {} }),
      mockSection(),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 4);
    expect(result.has(0)).toBe(true);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(false);
  });

  it("wraps to new row when column_span exceeds remaining space", () => {
    // 2 columns: section 0 (span 1, bg) on row 1, section 1 (span 2, no bg) on row 2
    const sections = [
      mockSection({ background: {} }),
      mockSection({ column_span: 2 }),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.size).toBe(0);
  });

  it("skips hidden sections", () => {
    // section 0 (hidden, bg) should not cause section 1 to need margin
    const sections = [
      mockSection({ hidden: true, background: {} }),
      mockSection(),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.size).toBe(0);
  });

  it("handles multiple rows with mixed backgrounds", () => {
    // 2 columns:
    // Row 1: section 0 (no bg) + section 1 (bg) -> section 0 needs margin
    // Row 2: section 2 (no bg) + section 3 (no bg) -> no margin needed
    const sections = [
      mockSection(),
      mockSection({ background: {} }),
      mockSection(),
      mockSection(),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.has(0)).toBe(true);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(false);
    expect(result.has(3)).toBe(false);
  });

  it("handles empty sections array", () => {
    const result = computeSectionsBackgroundAlignment([], 4);
    expect(result.size).toBe(0);
  });

  it("clamps column_span to columnCount", () => {
    // section with span 10 in a 2-column layout should be treated as span 2
    // Row 1: section 0 (span clamped to 2, bg), Row 2: section 1 (no bg)
    const sections = [
      mockSection({ column_span: 10, background: {} }),
      mockSection(),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 2);
    expect(result.has(1)).toBe(false);
  });

  it("marks multiple sections without background on same row", () => {
    // 3 columns: section 0 (no bg) + section 1 (bg) + section 2 (no bg)
    const sections = [
      mockSection(),
      mockSection({ background: {} }),
      mockSection(),
    ];
    const result = computeSectionsBackgroundAlignment(sections, 3);
    expect(result.has(0)).toBe(true);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(true);
  });
});
