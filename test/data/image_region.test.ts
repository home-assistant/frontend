import { describe, expect, it } from "vitest";
import {
  insertMidpoint,
  isImageRegion,
  movePoints,
  regionFromPoints,
} from "../../src/data/image_region";

// The selector writes these values straight into actions, so a wrong corner
// count or order, or a point outside 0-100, would reach the device unnoticed.
describe("image region geometry", () => {
  it("draws a clockwise rectangle from any two corners", () => {
    expect(
      regionFromPoints({ x: 80, y: 60 }, { x: 20, y: 10 }, 3, Infinity)
    ).toEqual([
      { x: 20, y: 10 },
      { x: 80, y: 10 },
      { x: 80, y: 60 },
      { x: 20, y: 60 },
    ]);
  });

  it("draws a triangle when only 3 corners are allowed", () => {
    expect(regionFromPoints({ x: 20, y: 10 }, { x: 80, y: 60 }, 3, 3)).toEqual([
      { x: 50, y: 10 },
      { x: 80, y: 60 },
      { x: 20, y: 60 },
    ]);
  });

  it("adds corners on the edges when more are required", () => {
    const region = regionFromPoints({ x: 0, y: 0 }, { x: 100, y: 100 }, 6, 6);
    expect(region).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]);
    expect(
      regionFromPoints({ x: 0, y: 0 }, { x: 100, y: 100 }, 9, 12)
    ).toHaveLength(9);
    // Many corners still don't land on top of each other.
    const many = regionFromPoints({ x: 25, y: 25 }, { x: 75, y: 75 }, 21, 21);
    expect(many).toHaveLength(21);
    expect(new Set(many.map(({ x, y }) => `${x},${y}`)).size).toBe(21);
  });

  it("moves a region but stops it at the image edges", () => {
    const region = [
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 30, y: 30 },
    ];
    expect(movePoints(region, -50, 5)).toEqual([
      { x: 0, y: 15 },
      { x: 20, y: 15 },
      { x: 20, y: 35 },
    ]);
    expect(movePoints(region, 0, 90)).toEqual([
      { x: 10, y: 80 },
      { x: 30, y: 80 },
      { x: 30, y: 100 },
    ]);
  });

  it("inserts a corner in the middle of an edge, also the closing one", () => {
    const region = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(insertMidpoint(region, 0)[1]).toEqual({ x: 5, y: 0 });
    expect(insertMidpoint(region, 2)).toEqual([...region, { x: 5, y: 5 }]);
  });

  it("only accepts values it can show without changing them", () => {
    expect(isImageRegion([{ x: 12.34, y: 100 }])).toBe(true);
    expect(isImageRegion([])).toBe(true);
    for (const value of [
      "not a list",
      [{ x: 150, y: 0 }],
      [{ x: -1, y: 0 }],
      [{ x: "12", y: 0 }],
      [{ x: "{{ 5 }}", y: 0 }],
      [{ x: null, y: 0 }],
      [{ x: 1 }],
      [null],
    ]) {
      expect(isImageRegion(value)).toBe(false);
    }
  });
});
