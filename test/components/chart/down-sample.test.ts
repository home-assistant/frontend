import { describe, expect, it } from "vitest";
import { downSampleLineData } from "../../../src/components/chart/down-sample";
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

const toObjectPoints = (points: [number, number][]) =>
  points.map((value) => ({ value }));

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
    const points = generatePoints(4, 1000);
    const result = downSampleLineData(points, 50);
    for (let i = 1; i < result.length; i++) {
      expect(result[i][0]).toBeGreaterThanOrEqual(result[i - 1][0]);
    }
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
