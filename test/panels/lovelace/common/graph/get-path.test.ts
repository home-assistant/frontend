import { describe, expect, it } from "vitest";
import { getPath } from "../../../../../src/panels/lovelace/common/graph/get-path";

// walks the line and curve commands of a path, so a test can ask where the
// line runs at a given x
const samplePath = (path: string): number[][] => {
  const commands = [...path.matchAll(/(Q?)(-?[\d.]+),(-?[\d.]+)/g)].map(
    ([, type, x, y]) => ({
      isControl: type === "Q",
      point: [Number(x), Number(y)],
    })
  );
  let from = commands[0].point;
  let control: number[] | undefined;
  const samples = [from];

  for (const { isControl, point } of commands.slice(1)) {
    if (isControl) {
      control = point;
      continue;
    }
    for (let step = 1; step <= 50; step++) {
      const t = step / 50;
      const inverse = 1 - t;
      samples.push(
        control
          ? [
              inverse ** 2 * from[0] +
                2 * inverse * t * control[0] +
                t ** 2 * point[0],
              inverse ** 2 * from[1] +
                2 * inverse * t * control[1] +
                t ** 2 * point[1],
            ]
          : [
              from[0] + (point[0] - from[0]) * t,
              from[1] + (point[1] - from[1]) * t,
            ]
      );
    }
    from = point;
    control = undefined;
  }

  return samples;
};

const yAt = (path: string, x: number): number =>
  samplePath(path).reduce((closest, sample) =>
    Math.abs(sample[0] - x) < Math.abs(closest[0] - x) ? sample : closest
  )[1];

const sampledRun = (count: number, fromX: number, y: number): number[][] =>
  Array.from({ length: count }, (_, index) => [fromX + index * 2, y]);

describe("getPath", () => {
  it("returns an empty path without coordinates", () => {
    expect(getPath([])).toBe("");
  });

  // Points that are a sample apart must keep curving through their midpoints,
  // which is what gives these graphs their smooth look.
  it("curves through the midpoints of evenly spread points", () => {
    const coords = [
      [0, 10],
      [10, 20],
      [20, 5],
      [30, 25],
    ];

    expect(getPath(coords)).toBe(
      "M 0,10 0,10 Q0,10 5,15 Q10,20 15,12.5 Q20,5 25,15 Q30,25 30,25"
    );
  });

  // A sensor that does not change sends nothing, so two points can be hours
  // apart. The curve used to bend across that whole stretch, showing a trend
  // where the value in fact held still.
  it("holds the value across a gap in the data", () => {
    const coords = [...sampledRun(20, 0, 30), [120, 30], [122, 0], [124, 30]];
    const path = getPath(coords);

    expect(yAt(path, 60)).toBeCloseTo(30);
    expect(yAt(path, 100)).toBeCloseTo(30);
  });

  // The whole history of a sensor that changed twice all day, which is where
  // the bend covers most of the graph.
  it("holds the value across a gap between a handful of points", () => {
    const coords = [
      [0, 30],
      [100, 0],
      [120, 0],
    ];

    // the curve leans into the next point towards the end of the gap, so this
    // is a half pixel rather than nothing at all
    expect(yAt(getPath(coords), 50)).toBeCloseTo(30, 0);
  });

  // The coordinates always end at the right edge of the graph, which can land
  // on the x of the last state and leave no other distance to go by.
  it("holds the value when the gap runs up to the last point", () => {
    const coords = [
      [0, 30],
      [100, 0],
      [100, 0],
    ];

    expect(getPath(coords)).toBe(
      "M 0,30 0,30 Q0,30 45,30 Q90,30 95,15 Q100,0 100,0 Q100,0 100,0"
    );
  });

  // Points that are far apart but evenly spread are a slow sensor, not a gap.
  it("keeps curving through evenly spread points that are far apart", () => {
    const coords = [
      [0, 30],
      [40, 0],
      [80, 30],
      [120, 0],
    ];

    expect(getPath(coords)).toBe(
      "M 0,30 0,30 Q0,30 20,15 Q40,0 60,15 Q80,30 100,15 Q120,0 120,0"
    );
  });

  it("handles coordinates sharing an x value", () => {
    const coords = [
      [0, 10],
      [10, 40],
      [10, 0],
      [20, 20],
    ];

    expect(getPath(coords)).not.toMatch(/NaN|Infinity/);
  });
});
