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
