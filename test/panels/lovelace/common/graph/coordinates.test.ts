import { describe, expect, it } from "vitest";
import { scaleCoordinates } from "../../../../../src/panels/lovelace/common/graph/coordinates";

// hui-graph-base rescales the line on screen into a new size before it
// animates to coordinates computed for that size. Wrong math here makes the
// graph jump at the start of the animation after a resize.
describe("scaleCoordinates", () => {
  it("scales x and y independently into the new size", () => {
    const scaled = scaleCoordinates(
      [
        [0, 60],
        [150, 30],
        [300, 0],
      ],
      { width: 300, height: 60 },
      { width: 200, height: 80 }
    );
    const expected = [
      [0, 80],
      [100, 40],
      [200, 0],
    ];
    expect(scaled).toHaveLength(expected.length);
    scaled.forEach(([x, y], index) => {
      expect(x).toBeCloseTo(expected[index][0]);
      expect(y).toBeCloseTo(expected[index][1]);
    });
  });

  it("returns the same coordinates when the size did not change", () => {
    const coordinates = [
      [0, 10],
      [300, 50],
    ];
    expect(
      scaleCoordinates(
        coordinates,
        { width: 300, height: 60 },
        { width: 300, height: 60 }
      )
    ).toBe(coordinates);
  });
});
