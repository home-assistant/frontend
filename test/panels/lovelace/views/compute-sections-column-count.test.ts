import { describe, expect, it } from "vitest";
import {
  computeSectionsColumnCount,
  parseCssPx,
} from "../../../../src/panels/lovelace/views/compute-sections-column-count";

// Defaults from hui-sections-view: --column-min-width 320px, --column-gap 32px,
// wrapper padding 0 var(--column-gap) → 64px.
const MIN_COLUMN_WIDTH = 320;
const COLUMN_GAP = 32;
const PADDING = 64;

const columnsFor = (totalWidth: number) =>
  computeSectionsColumnCount(totalWidth, PADDING, MIN_COLUMN_WIDTH, COLUMN_GAP);

describe("parseCssPx", () => {
  it("parses integer pixel values", () => {
    expect(parseCssPx("32px")).toBe(32);
  });

  it("parses fractional pixel values from zoom", () => {
    expect(parseCssPx("31.68px")).toBe(31.68);
  });

  it("returns 0 for empty or non-numeric values", () => {
    expect(parseCssPx("")).toBe(0);
    expect(parseCssPx("auto")).toBe(0);
  });
});

describe("computeSectionsColumnCount", () => {
  it("returns 3 columns at 1080px (kiosk width just under the exact fit)", () => {
    expect(columnsFor(1080)).toBe(3);
  });

  it("returns 3 columns at the exact 3-column fit of 1088px", () => {
    expect(columnsFor(1088)).toBe(3);
  });

  it("returns 1 column at 670px so the sidebar still stacks", () => {
    expect(columnsFor(670)).toBe(1);
  });

  it("returns 1 column when width is missing or zero", () => {
    expect(columnsFor(0)).toBe(1);
    expect(
      computeSectionsColumnCount(-10, PADDING, MIN_COLUMN_WIDTH, COLUMN_GAP)
    ).toBe(1);
  });

  it("still returns 3 columns with zoom-scaled fractional CSS pixels", () => {
    const minColumnWidth = parseCssPx("316.8px");
    const columnGap = parseCssPx("31.68px");
    const padding = parseCssPx("31.68px") + parseCssPx("31.68px");
    expect(
      computeSectionsColumnCount(1080, padding, minColumnWidth, columnGap)
    ).toBe(3);
  });
});
