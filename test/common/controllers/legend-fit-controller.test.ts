import { describe, expect, it } from "vitest";
import { fitInRows } from "../../../src/common/controllers/legend-fit-controller";

describe("fitInRows", () => {
  it("shows every item when they fit in two rows", () => {
    expect(fitInRows([100, 100, 100, 100], 60, 300, 12, 2)).toBe(4);
  });

  it("leaves room for the more item on the last row", () => {
    expect(fitInRows([100, 100, 100, 100, 100], 60, 300, 12, 2)).toBe(4);
    expect(fitInRows([100, 100, 100, 100, 100], 100, 300, 12, 2)).toBe(3);
  });
});
