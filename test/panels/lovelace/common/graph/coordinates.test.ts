import { describe, expect, it } from "vitest";
import { downSampleLineData } from "../../../../../src/components/chart/down-sample";
import {
  coordinates as graphCoordinates,
  scaleCoordinates,
} from "../../../../../src/panels/lovelace/common/graph/coordinates";

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

// A graph holds the last point before a gap across it, so that point has to be
// the state the sensor settled on, which sampling would otherwise drop.
describe("coordinates", () => {
  const busyThenQuiet: [number, number][] = [
    [0, 0],
    [10, 100],
    [20, 0],
    ...Array.from({ length: 10 }, (_, index): [number, number] => [
      900 + index * 10,
      50,
    ]),
  ];
  const limits = { minX: 0, maxX: 1000 };

  it("keeps the last state before a gap that sampling dropped", () => {
    const { points } = graphCoordinates(busyThenQuiet, 100, 10, 10, limits);
    const beforeGap = points.filter(([x]) => x < 90);

    expect(beforeGap[beforeGap.length - 1]).toEqual([2, points[0][1]]);
  });

  it("keeps the last state before a gap when sampling averages", () => {
    const { points } = graphCoordinates(
      busyThenQuiet,
      100,
      10,
      10,
      limits,
      true
    );
    const zeroY = graphCoordinates(busyThenQuiet, 100, 10, 10, limits)
      .points[0][1];
    const beforeGap = points.filter(([x]) => x < 90);

    expect(beforeGap[beforeGap.length - 1]).toEqual([2, zeroY]);
  });

  // calcPoints closes the graph at maxX with the last value, which is the
  // state the entity is still in.
  it("closes the graph on the last state before a quiet stretch", () => {
    const { points } = graphCoordinates(
      [
        ...Array.from({ length: 70 }, (_, index): [number, number] => [
          index * 10,
          30,
        ]),
        [700, 0],
        [705, 100],
        [715, 30],
      ],
      100,
      10,
      50,
      limits
    );

    expect(points[points.length - 1][1]).toBe(points[0][1]);
  });

  it("adds nothing to history without gaps", () => {
    const regular = Array.from(
      { length: 100 },
      (_, index): [number, number] => [index * 10, (index * 37) % 11]
    );
    const { points } = graphCoordinates(regular, 100, 10, 10, limits);

    expect(points).toHaveLength(
      downSampleLineData(regular, 10, 0, 1000).length + 1
    );
  });
});
