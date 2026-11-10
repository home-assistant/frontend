import { describe, expect, it } from "vitest";
import type { EntityHistoryState } from "../../../../../src/data/history";
import {
  coordinates as plainCoordinates,
  coordinatesMinimalResponseCompressedState,
  scaleCoordinates,
} from "../../../../../src/panels/lovelace/common/graph/coordinates";
import { getPath } from "../../../../../src/panels/lovelace/common/graph/get-path";

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

const states = (readings: [number, number][]): EntityHistoryState[] =>
  readings.map(([x, value]) => ({ lu: x / 1000, s: String(value), a: {} }));

const every = (from: number, to: number, value: (x: number) => number) =>
  Array.from(
    { length: Math.floor((to - from) / 10) },
    (_, index): [number, number] => [
      from + index * 10,
      value(from + index * 10),
    ]
  );

// 100 px wide and 120 high over 0 to 1000 with values 0 to 100, which calcPoints
// pads by 10%, so a reading at x is drawn at x / 10 and a value v at 110 - v
const LIMITS = { minX: 0, maxX: 1000, minY: 0, maxY: 100 };
const draw = (readings: [number, number][], maxDetails = 50, useMean = false) =>
  coordinatesMinimalResponseCompressedState(
    states(readings),
    100,
    120,
    maxDetails,
    LIMITS,
    useMean
  ).points;

// walks the line the graph draws, so a test can read its value at an x
const valueAt = (points: number[][], x: number): number => {
  const commands = [...getPath(points).matchAll(/(Q?)(-?[\d.]+),(-?[\d.]+)/g)];
  let from = [Number(commands[0][2]), Number(commands[0][3])];
  let control: number[] | undefined;
  let closest = from;
  for (const [, type, px, py] of commands.slice(1)) {
    const point = [Number(px), Number(py)];
    if (type === "Q") {
      control = point;
      continue;
    }
    for (let step = 1; step <= 50; step++) {
      const t = step / 50;
      const c = control ?? from;
      const sample = [0, 1].map(
        (axis) =>
          (1 - t) ** 2 * from[axis] +
          2 * (1 - t) * t * c[axis] +
          t ** 2 * point[axis]
      );
      if (Math.abs(sample[0] - x / 10) < Math.abs(closest[0] - x / 10)) {
        closest = sample;
      }
    }
    from = point;
    control = undefined;
  }
  return 110 - closest[1];
};

// A sensor that does not change sends nothing, so two readings can be hours
// apart. The line used to curve across that stretch, showing a trend that
// never happened while the value in fact held.
describe("coordinatesMinimalResponseCompressedState", () => {
  const spiky = (x: number) => ((x / 10) % 2 ? 100 : 20);

  it("holds the state across a stretch without readings", () => {
    const points = draw([
      ...every(0, 300, spiky),
      [300, 0],
      ...every(800, 1000, spiky),
    ]);

    expect(valueAt(points, 400)).toBeCloseTo(0);
    expect(valueAt(points, 550)).toBeCloseTo(0);
    expect(valueAt(points, 700)).toBeCloseTo(0);
  });

  // each curve reaches halfway to its neighbours, so without points close to
  // both ends the change would spread far into the stretch
  it("keeps the curves at both ends of the stretch tight", () => {
    const points = draw([
      ...every(0, 300, () => 50),
      [300, 0],
      ...every(800, 1000, () => 50),
    ]);

    expect(valueAt(points, 330)).toBeCloseTo(0);
    expect(valueAt(points, 770)).toBeCloseTo(0);
  });

  // sampling keeps the lowest and highest value of each frame, so a fan that
  // spins up and stops within one frame would be held at full speed
  it("holds the state sampling dropped", () => {
    const points = draw(
      [[0, 0], [10, 100], [20, 0], ...every(900, 1000, () => 50)],
      10
    );

    expect(valueAt(points, 500)).toBeCloseTo(0);
  });

  it("holds the state sampling averaged away", () => {
    const points = draw(
      [[0, 0], [10, 100], [20, 0], ...every(900, 1000, () => 50)],
      10,
      true
    );

    expect(valueAt(points, 500)).toBeCloseTo(0);
  });

  // every other point of such a graph is a mean, so a raw reading after the
  // stretch would stand out as a spike
  it("keeps showing means after the stretch when sampling averages", () => {
    const points = draw(
      [...every(0, 300, () => 50), [900, 100], ...every(910, 1000, () => 0)],
      10,
      true
    );

    expect(points).not.toContainEqual([90, 110 - 100]);
    expect(valueAt(points, 600)).toBeCloseTo(50);
  });

  it("holds the last of several states recorded at once", () => {
    const points = draw(
      [[0, 0], [10, 100], [10, 0], ...every(900, 1000, () => 50)],
      10
    );

    expect(valueAt(points, 500)).toBeCloseTo(0);
  });

  // the first reading after the stretch is neither the lowest nor the highest
  // of its frame, so sampling drops it and the hold would run on past it
  it("ends the hold at the reading the sensor came back with", () => {
    const resumedFrame: Record<number, number> = { 710: 20, 730: 90, 740: 10 };
    const points = draw(
      [
        ...every(0, 300, () => 50),
        ...every(710, 1000, (x) => resumedFrame[x] ?? 50),
      ],
      10
    );

    expect(points).toContainEqual([71, 110 - 20]);
  });

  // The first reading is the state at the start of the window, which moves on
  // with every redraw, so its stretch shrinks. Held only while it covers a
  // tenth of the graph, it would snap back into a curve as it scrolls out.
  it("holds the state at the start of the window while it shrinks", () => {
    const points = draw([[0, 0], ...every(80, 1000, () => 50)]);

    expect(valueAt(points, 40)).toBeCloseTo(0);
  });

  // History that starts late in the window lets a stretch be narrower than a
  // sampling frame, so one frame mean can stand for readings on both sides of
  // it and land inside it. It must not be lost with the hold.
  it("keeps a frame mean that spans a stretch", () => {
    const readings: [number, number][] = [
      [700, 20],
      [710, 20],
      [760, 90],
      ...every(770, 1000, () => 25),
    ];
    const points = draw(readings, 10, true);
    // the mean of the first frame, 700 to 800
    const frameMean = (20 + 20 + 90 + 25 * 3) / 6;

    expect(valueAt(points, 735)).toBeCloseTo(20);
    expect(points).toContainEqual([76, 110 - frameMean]);
  });

  // calcPoints closes the graph at the end with the last value, which is the
  // state the entity is still in
  it("closes the graph on the last state", () => {
    const points = draw(
      [...every(0, 700, () => 30), [700, 0], [705, 100], [715, 30]],
      50
    );

    expect(points[points.length - 1][1]).toBe(110 - 30);
  });

  // Sampling can keep two frames' points at their far ends, which looks like
  // a gap although readings carry on, and a sensor that reports slowly but
  // evenly has no gap either.
  it("draws history without a quiet stretch as before", () => {
    const extremesAtFrameEnds = every(0, 1000, (x) => {
      if (x === 180 || (x !== 100 && x % 100 === 0)) {
        return 0;
      }
      if (x === 190 || (x !== 110 && x % 100 === 10)) {
        return 100;
      }
      return 40 + ((x / 10) % 3);
    });
    const slow: [number, number][] = Array.from({ length: 12 }, (_, index) => [
      index * 80,
      100 - index * 5,
    ]);

    for (const [readings, maxDetails] of [
      [extremesAtFrameEnds, 10],
      [slow, 50],
    ] as [[number, number][], number][]) {
      expect(draw(readings, maxDetails)).toEqual(
        plainCoordinates(readings, 100, 120, maxDetails, LIMITS).points
      );
    }
  });
});
