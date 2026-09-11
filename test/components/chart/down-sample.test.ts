import { describe, expect, it } from "vitest";
import {
  downSampleAlignedLineData,
  downSampleLineData,
} from "../../../src/components/chart/down-sample";
import { digestResult } from "../../fixtures/digest";
import { FIXED_EPOCH_MS, SCALES } from "../../fixtures/history-states";
import { createSeededRandom } from "../../fixtures/random";

const generatePoints = (
  seed: number,
  count: number,
  intervalMs = 30_000
): [number, number][] => {
  const random = createSeededRandom(seed);
  const points: [number, number][] = [];
  let y = 100;
  for (let i = 0; i < count; i++) {
    y = Math.max(0, y + (random() - 0.5) * 10);
    points.push([FIXED_EPOCH_MS + i * intervalMs, Number(y.toFixed(3))]);
  }
  return points;
};

// Gap markers: the chart data modules push a null value to break the line
// where an entity was unavailable.
type GappedPoint = [number, number | null | undefined];

const toObjectPoints = (points: GappedPoint[]) =>
  points.map((value) => ({ value }));

const expectXOrdered = (result: { [0]: number }[]) => {
  for (let i = 1; i < result.length; i++) {
    expect(result[i][0]).toBeGreaterThanOrEqual(result[i - 1][0]);
  }
};

// A series whose readings are all positive, with an unavailable stretch that
// starts inside the first frame. Mirrors the point sequence
// state-history-chart-line-data.ts emits for a gap.
const gappedPoints: GappedPoint[] = [
  [FIXED_EPOCH_MS, 50],
  [FIXED_EPOCH_MS + 1_000, 90], // frame maximum
  [FIXED_EPOCH_MS + 2_000, 60],
  [FIXED_EPOCH_MS + 3_000, 10], // frame minimum
  [FIXED_EPOCH_MS + 4_000, 20], // last reading before the gap
  [FIXED_EPOCH_MS + 4_001, null], // gap marker
  [FIXED_EPOCH_MS + 30_000, 55],
  [FIXED_EPOCH_MS + 31_000, 45],
];

// A generated series with three unavailable stretches of different lengths.
const generateGappedPoints = (seed: number, count: number) => {
  const points: GappedPoint[] = generatePoints(seed, count);
  for (const [start, length] of [
    [Math.floor(count * 0.13), 3],
    [Math.floor(count * 0.4), 25],
    [Math.floor(count * 0.83), 1],
  ]) {
    const gapStart = points[start][0];
    points.splice(
      start + 1,
      length,
      [gapStart + 1, points[start][1]],
      [gapStart + 1, null]
    );
  }
  return points;
};

describe("downSampleLineData", () => {
  it("returns empty array for undefined data", () => {
    expect(downSampleLineData(undefined, 100)).toEqual([]);
  });

  it("returns input unchanged when below maxDetails", () => {
    const points = generatePoints(1, 50);
    expect(downSampleLineData(points, 100)).toBe(points);
  });

  it("returns input unchanged when maxDetails is zero", () => {
    const points = generatePoints(11, 720);
    expect(downSampleLineData(points, 0)).toBe(points);
    expect(
      downSampleLineData(points, 0, points[0][0], points[points.length - 1][0])
    ).toBe(points);
  });

  it("returns input unchanged when all points share the same x", () => {
    const points: [number, number][] = Array.from({ length: 20 }, (_, i) => [
      FIXED_EPOCH_MS,
      i,
    ]);
    expect(downSampleLineData(points, 5)).toBe(points);
  });

  it("skips points with non-finite coordinates", () => {
    const points = generatePoints(2, 200);
    points[10] = [points[10][0], NaN];
    points[20] = [NaN, points[20][1]];
    const result = downSampleLineData(points, 50);
    expect(result).not.toContain(points[10]);
    expect(result).not.toContain(points[20]);
  });

  it("min/max mode only returns points from the input", () => {
    const points = generatePoints(3, 500);
    const result = downSampleLineData(points, 50);
    const inputSet = new Set(points);
    expect(result.length).toBeLessThanOrEqual(points.length);
    result.forEach((point) => expect(inputSet.has(point)).toBe(true));
  });

  it("min/max mode preserves x-order for sorted input", () => {
    expectXOrdered(downSampleLineData(generatePoints(4, 1000), 50));
  });

  it("min/max mode matches characterization snapshot", () => {
    expect(downSampleLineData(generatePoints(5, 300), 40)).toMatchSnapshot();
  });

  it("mean mode matches characterization snapshot", () => {
    expect(
      downSampleLineData(generatePoints(5, 300), 40, undefined, undefined, true)
    ).toMatchSnapshot();
  });

  it("object-shaped points match characterization snapshot", () => {
    expect(
      downSampleLineData(toObjectPoints(generatePoints(6, 300)), 40)
    ).toMatchSnapshot();
  });

  it("explicit minX/maxX bounds match characterization snapshot", () => {
    const points = generatePoints(7, 300);
    const minX = points[0][0] - 60_000;
    const maxX = points[points.length - 1][0] + 60_000;
    expect(downSampleLineData(points, 40, minX, maxX)).toMatchSnapshot();
  });

  // A window that follows "now" must keep sampling the same points, otherwise
  // the line redraws with a different shape every few seconds. See #53542.
  const HALF_DAY_OF_5S_SAMPLES = 8640;
  const SIX_HOURS = 6 * 3_600_000;
  // The frames straddling either end of a window are only partly filled, so
  // they legitimately differ between two windows. Ignore a frame's width.
  const EDGE_MARGIN = 60_000;

  it.each([
    ["min/max mode", false],
    ["mean mode", true],
  ])("%s samples the same points when the window slides", (_name, useMean) => {
    const points = generatePoints(12, HALF_DAY_OF_5S_SAMPLES, 5_000);
    const start = FIXED_EPOCH_MS + 3_600_000;
    const sample = (offset: number) =>
      downSampleLineData(
        points.filter(
          ([x]) => x >= start + offset && x <= start + offset + SIX_HOURS
        ),
        600,
        start + offset,
        start + offset + SIX_HOURS,
        useMean
      ) as [number, number][];

    const reference = sample(0);
    expect(reference.length).toBeLessThan(HALF_DAY_OF_5S_SAMPLES / 2);

    for (const offset of [10_000, 30_000, 60_000]) {
      const inOverlap = (result: [number, number][]) =>
        result.filter(
          ([x]) =>
            x > start + offset + EDGE_MARGIN &&
            x < start + SIX_HOURS - EDGE_MARGIN
        );
      expect(inOverlap(sample(offset))).toEqual(inOverlap(reference));
    }
  });

  it("min/max mode samples the same points when the window grows", () => {
    const points = generatePoints(13, HALF_DAY_OF_5S_SAMPLES, 5_000);
    const start = FIXED_EPOCH_MS;
    const sample = (growth: number) =>
      downSampleLineData(
        points.filter(([x]) => x <= start + SIX_HOURS + growth),
        600,
        start,
        start + SIX_HOURS + growth
      ) as [number, number][];

    const drawn = (result: [number, number][]) =>
      result.filter(([x]) => x < start + SIX_HOURS - EDGE_MARGIN);
    const reference = sample(0);
    expect(drawn(reference).length).toBeGreaterThan(100);

    for (const growth of [10_000, 30_000, 60_000]) {
      expect(drawn(sample(growth))).toEqual(drawn(reference));
    }
  });

  it("aligns frames to absolute time, not to the start of the window", () => {
    // An hour of 5s samples over a 120 frame budget resolves to 30s frames
    const FRAME = 30_000;
    const start = FIXED_EPOCH_MS;
    const points = generatePoints(14, 720, 5_000);
    const result = downSampleLineData(
      points,
      120,
      start,
      start + 3_600_000
    ) as [number, number][];

    const framed = new Map<number, number[]>();
    points.forEach(([x, y]) => {
      const frame = Math.floor(x / FRAME);
      framed.set(frame, [...(framed.get(frame) ?? []), y]);
    });
    expect(result.length).toBeLessThan(points.length);
    result.forEach(([x, y]) => {
      const values = framed.get(Math.floor(x / FRAME));
      expect(values).toBeDefined();
      expect([Math.min(...values!), Math.max(...values!)]).toContain(y);
    });
  });

  it("small scale digest is stable", () => {
    expect(
      digestResult(downSampleLineData(generatePoints(8, SCALES.small), 500))
    ).toMatchSnapshot();
  });

  it("large scale digest is stable", () => {
    expect(
      digestResult(downSampleLineData(generatePoints(9, SCALES.large), 500))
    ).toMatchSnapshot();
  });

  it("keeps the frame minimum when a gap marker shares the frame", () => {
    // Without special handling the marker becomes y=0, wins the minimum slot
    // and the real minimum (10) is dropped.
    expect(downSampleLineData(gappedPoints, 3)).toEqual([
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 3_000, 10],
      [FIXED_EPOCH_MS + 4_001, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ]);
  });

  it("drops a marker whose gap closes within the same frame", () => {
    // A frame spans about one device pixel, so a gap that opens and closes
    // inside one is too narrow to show. The values around it stay.
    const points: GappedPoint[] = [
      [FIXED_EPOCH_MS, 50],
      [FIXED_EPOCH_MS + 1_000, 10], // frame minimum, before the marker
      [FIXED_EPOCH_MS + 1_001, null],
      [FIXED_EPOCH_MS + 2_000, 90], // frame maximum, after the marker
      [FIXED_EPOCH_MS + 3_000, 60],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ];
    expect(downSampleLineData(points, 3)).toEqual([
      [FIXED_EPOCH_MS + 1_000, 10],
      [FIXED_EPOCH_MS + 2_000, 90],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ]);
  });

  it("keeps a marker sharing its x with a value after that value", () => {
    // statistics-chart-data.ts ends the line and breaks it at the same x
    const points: GappedPoint[] = [
      [FIXED_EPOCH_MS, 50],
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 2_000, 10],
      [FIXED_EPOCH_MS + 2_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ];
    expect(downSampleLineData(points, 3)).toEqual([
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 2_000, 10],
      [FIXED_EPOCH_MS + 2_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ]);
  });

  it("keeps a gap marker whose frame holds no values", () => {
    const points: GappedPoint[] = [
      [FIXED_EPOCH_MS, 50],
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 2_000, 60],
      [FIXED_EPOCH_MS + 15_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ];
    expect(downSampleLineData(points, 3)).toEqual([
      [FIXED_EPOCH_MS, 50],
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 15_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ]);
  });

  it("keeps a single gap marker per frame", () => {
    // A run of nulls inside one frame renders the same as a single null: the
    // break only depends on which points the marker sits between.
    const points: GappedPoint[] = [
      [FIXED_EPOCH_MS, 50],
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 2_000, 10],
      [FIXED_EPOCH_MS + 3_000, null],
      [FIXED_EPOCH_MS + 4_000, null],
      [FIXED_EPOCH_MS + 5_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ];
    expect(downSampleLineData(points, 3)).toEqual([
      [FIXED_EPOCH_MS + 1_000, 90],
      [FIXED_EPOCH_MS + 2_000, 10],
      [FIXED_EPOCH_MS + 5_000, null],
      [FIXED_EPOCH_MS + 30_000, 55],
      [FIXED_EPOCH_MS + 31_000, 45],
    ]);
  });

  it("bounds the output on a series where most points are null", () => {
    // The climate heating/cooling datasets push a null for every state where
    // the mode is inactive, so markers must not escape the frame budget.
    const values = generatePoints(20, SCALES.medium);
    const random = createSeededRandom(21);
    const gapped: GappedPoint[] = values.map(([x, y]) =>
      random() < 0.65 ? [x, null] : [x, y]
    );
    const gapless = downSampleLineData(values, 500);
    const result = downSampleLineData(gapped, 500);
    // Both series share an x grid, so they share frames, and the gapless one
    // emits at least one point per frame. A gapped frame emits at most three:
    // min, max and a single marker.
    expect(result.length).toBeLessThanOrEqual(3 * gapless.length);
    expect(
      result.filter((point) => point[1] === null).length
    ).toBeLessThanOrEqual(gapless.length);
  });

  it("handles gap markers on object-shaped points", () => {
    const points = toObjectPoints(gappedPoints);
    expect(downSampleLineData(points, 3)).toEqual([
      points[1],
      points[3],
      points[5],
      points[6],
      points[7],
    ]);
  });

  it("handles gap markers on Date x values", () => {
    // statistics charts use Date objects for x
    const points = gappedPoints.map(
      ([x, y]) => [new Date(x), y] as [Date, number | null | undefined]
    );
    expect(downSampleLineData(points, 3)).toEqual([
      points[1],
      points[3],
      points[5],
      points[6],
      points[7],
    ]);
  });

  it("mean mode leaves gap markers out of the average", () => {
    const points: GappedPoint[] = [
      [FIXED_EPOCH_MS, 10],
      [FIXED_EPOCH_MS + 1_000, 20],
      [FIXED_EPOCH_MS + 1_001, null],
      [FIXED_EPOCH_MS + 2_000, 30],
      [FIXED_EPOCH_MS + 30_000, 100],
      [FIXED_EPOCH_MS + 31_000, 100],
    ];
    expect(downSampleLineData(points, 3, undefined, undefined, true)).toEqual([
      // (10 + 20 + 30) / 3, not (10 + 20 + 0 + 30) / 4
      [FIXED_EPOCH_MS + 1_000, 20],
      [FIXED_EPOCH_MS + 30_500, 100],
    ]);
  });

  it("min/max mode preserves x-order for gapped input", () => {
    const result = downSampleLineData(generateGappedPoints(22, 1000), 50);
    // Of the three gaps only the 25 point one outlasts its frame; the one and
    // three point gaps close within theirs and are dropped.
    expect(result.filter((point) => point[1] === null)).toHaveLength(1);
    expectXOrdered(result);
  });

  it("large scale mean-mode digest is stable", () => {
    expect(
      digestResult(
        downSampleLineData(
          generatePoints(10, SCALES.large),
          500,
          undefined,
          undefined,
          true
        )
      )
    ).toMatchSnapshot();
  });
});

describe("downSampleAlignedLineData", () => {
  it("keeps stacked series aligned while preserving each series extrema and gaps", () => {
    const first: [number, number | null][] = [];
    const second: [number, number | null][] = [];
    for (let index = 0; index < 600; index++) {
      first.push([index, index === 211 ? 1000 : index === 350 ? null : index]);
      second.push([
        index,
        index === 87 ? -100 : index === 351 ? null : 600 - index,
      ]);
    }
    const sampled = downSampleAlignedLineData([first, second], 40);
    expect((sampled[0] as [number, number | null][]).map(([x]) => x)).toEqual(
      (sampled[1] as [number, number | null][]).map(([x]) => x)
    );
    expect(sampled[0]).toContainEqual([211, 1000]);
    expect(sampled[1]).toContainEqual([87, -100]);
    expect(sampled[0]).toContainEqual([350, null]);
    expect(sampled[1]).toContainEqual([351, null]);
    expect(sampled[0][0]).toEqual(first[0]);
    expect(sampled[0][sampled[0].length - 1]).toEqual(first[first.length - 1]);
    expect(sampled[0].length).toBeLessThanOrEqual(40 * 2 * 2 + 2);
  });

  it("bounds long null runs while retaining both sides of gap transitions", () => {
    const first: [number, number | null][] = Array.from(
      { length: 100000 },
      (_, i) => [i, i < 100 || i > 99900 ? 1 : null]
    );
    const second: [number, number | null][] = first.map(([x]) => [x, 2]);
    const sampled = downSampleAlignedLineData([first, second], 40);
    expect(sampled[0].length).toBeLessThan(200);
    for (const index of [99, 100, 99900, 99901]) {
      expect(sampled[0]).toContainEqual(first[index]);
    }
    expect(sampled[0].length).toBe(sampled[1].length);
  });

  it("keeps duplicate-time value/null boundaries inside one sampling frame", () => {
    const first: [number, number | null][] = [
      [0, 10],
      [1, 10],
      [1, null],
      [2, null],
      [2, 20],
      [3, 20],
    ];
    const second: [number, number | null][] = first.map(([x]) => [x, 30]);
    const sampled = downSampleAlignedLineData([first, second], 1);
    expect(sampled[0]).toEqual(first);
    expect(sampled[1]).toEqual(second);
  });

  it("retains extrema of the displayed stack sum", () => {
    const first: [number, number][] = [
      [0, 0],
      [1, 100],
      [2, 60],
      [3, 0],
      [4, 0],
    ];
    const second: [number, number][] = [
      [0, 100],
      [1, 0],
      [2, 60],
      [3, 0],
      [4, 0],
    ];
    const sampled = downSampleAlignedLineData([first, second], 1);
    expect(sampled[0]).toEqual([
      [0, 0],
      [1, 100],
      [2, 60],
      [3, 0],
      [4, 0],
    ]);
    expect(sampled[1]).toEqual([
      [0, 100],
      [1, 0],
      [2, 60],
      [3, 0],
      [4, 0],
    ]);
  });

  it.each([1, -1])(
    "keeps intermediate stack extrema across gaps (sign %s)",
    (sign) => {
      const values = [
        [0, 100, 60, 0, 0],
        [100, 0, 60, 0, 0],
        [null, null, null, null, null],
        [100, 100, 80, 100, 100],
      ];
      const data = values.map((row) =>
        row.map((value, x): [number, number | null] => [
          x,
          value === null ? null : sign * value,
        ])
      );
      const sampled = downSampleAlignedLineData(data, 1);
      // The intermediate level peaks at 120 although the final level stays 200.
      expect(sampled[0]).toContainEqual([2, sign * 60]);
      expect(sampled[1]).toContainEqual([2, sign * 60]);
    }
  );

  it.each(["all", "positive", "negative"] as const)(
    "respects the %s stack strategy",
    (strategy) => {
      const sign = strategy === "negative" ? -1 : 1;
      const data: [number, number][][] = [
        [0, 100, 60, 0, 0].map((value, x) => [x, sign * value]),
        [100, 0, 60, 0, 0].map((value, x) => [x, sign * value]),
      ];
      const sampled = downSampleAlignedLineData(data, 1, undefined, undefined, [
        strategy,
        strategy,
      ]);
      expect(sampled[0]).toContainEqual([2, sign * 60]);
    }
  );

  it("uses ECharts decimal addition before choosing the next stack level", () => {
    const values = [
      [0.2, -0.8, -0.6, -0.5, 0.7, -0.2, -0.1, 0.9],
      [0.4, -0.8, 0.5, 0.2, -0.9, 0.5, -0.7, -0.8],
      [-0.6, 0.8, 0.1, 0, -0.6, -0.4, 0.5, 0.9],
      [-1, -1, 0.5, 0.4, 0.8, -0.9, -0.9, 0.6],
    ];
    const data = values.map((row) =>
      row.map((y, x): [number, number] => [x / 10, y])
    );
    const sampled = downSampleAlignedLineData(data, 1, undefined, undefined, [
      "negative",
      "samesign",
      "positive",
      "positive",
    ]);
    // Rounding 0.2 + 0.4 - 0.6 to zero changes the preceding positive level.
    // The last level's actual minimum is at x=0.5, not x=0.
    expect(sampled[3]).toContainEqual([0.5, -0.9]);
  });

  it("preserves finite all-stack extrema after a null middle member", () => {
    const values = [
      [11, 8, 0, 9, 18, 3, 1, 14, 11, 15, 11, 0, 4, 14, 10, 11, 15, 15, 13, 12],
      [
        11,
        4,
        15,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        2,
        3,
        1,
        1,
        14,
        13,
        15,
        13,
      ],
      [
        10, 17, 16, 8, 12, 18, 10, 14, 12, 7, 4, 17, 16, 13, 10, 4, 13, 20, 9,
        11,
      ],
    ];
    const data = values.map((row) =>
      row.map((y, x): [number, number | null] => [x / 100, y])
    );
    const sampled = downSampleAlignedLineData(data, 1, undefined, undefined, [
      "all",
      "all",
      "all",
    ]);
    // With "all", ECharts propagates the middle member's null into the top
    // level. Skipping that null invents a smaller value inside the gap and
    // discards the real minimum of 11 + 1 + 4 = 16 at x=0.15.
    expect(sampled[2]).toContainEqual([0.15, 4]);
  });

  it("does not align mismatched series by corrupting their data", () => {
    const first: [number, number][] = Array.from({ length: 200 }, (_, x) => [
      x,
      x,
    ]);
    const second: [number, number][] = Array.from({ length: 199 }, (_, x) => [
      x,
      x,
    ]);
    const sampled = downSampleAlignedLineData([first, second], 20);
    expect(sampled[0]).toEqual(first);
    expect(sampled[1]).toEqual(second);
  });

  it("does not align equal-length series with different timestamps", () => {
    const first: [number, number][] = Array.from({ length: 200 }, (_, x) => [
      x,
      x,
    ]);
    const second: [number, number][] = Array.from({ length: 200 }, (_, x) => [
      x + 1,
      x,
    ]);
    const sampled = downSampleAlignedLineData([first, second], 20);
    expect(sampled[0]).toEqual(first);
    expect(sampled[1]).toEqual(second);
  });
});
