import { describe, expect, it } from "vitest";
import {
  fitInRows,
  fitLegend,
} from "../../../src/common/controllers/legend-fit-controller";

describe("fitInRows", () => {
  it("shows every item when they fit in two rows", () => {
    expect(fitInRows([100, 100, 100, 100], 60, 300, 12, 2)).toBe(4);
  });

  it("leaves room for the more item on the last row", () => {
    expect(fitInRows([100, 100, 100, 100, 100], 60, 300, 12, 2)).toBe(4);
    expect(fitInRows([100, 100, 100, 100, 100], 100, 300, 12, 2)).toBe(3);
  });
});

describe("fitLegend", () => {
  const widths = Array(17).fill(140);

  it("fits three rows when the list is narrow", () => {
    expect(fitLegend(widths, 100, 440, 12)).toBe(6);
  });

  it("never shows fewer items when the list gets wider", () => {
    let previous = 0;
    for (let rowWidth = 300; rowWidth <= 1200; rowWidth += 10) {
      const fit = fitLegend(widths, 100, rowWidth, 12);
      expect(fit).toBeGreaterThanOrEqual(previous);
      previous = fit;
    }
  });
});
