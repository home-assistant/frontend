import { describe, test } from "vitest";
import {
  downSampleAlignedLineData,
  downSampleLineData,
} from "../../src/components/chart/down-sample";
import { FIXED_EPOCH_MS, SCALES } from "../fixtures/history-states";
import { createSeededRandom } from "../fixtures/random";

// A typical chart is a few hundred CSS pixels wide
const MAX_DETAILS = 500;

const generatePoints = (seed: number, count: number): [number, number][] => {
  const random = createSeededRandom(seed);
  const points: [number, number][] = [];
  let y = 100;
  for (let i = 0; i < count; i++) {
    y = Math.max(0, y + (random() - 0.5) * 10);
    points.push([FIXED_EPOCH_MS + i * 30_000, y]);
  }
  return points;
};

// The chart data modules break the line with a null value. A handful of them
// stands for an entity that went unavailable; a series that is mostly null
// stands for the climate heating dataset, which emits one per inactive state.
const withGaps = (
  points: [number, number][],
  isGap: (index: number) => boolean
): [number, number | null][] =>
  points.map(([x, y], index) => (isGap(index) ? [x, null] : [x, y]));

const small = generatePoints(1, SCALES.small);
const medium = generatePoints(2, SCALES.medium);
const large = generatePoints(3, SCALES.large);
const largeObjects = large.map((value) => ({ value }));
const largeFewGaps = withGaps(large, (index) => index % 20_000 === 0);
const largeMostlyGaps = withGaps(
  large,
  (index) => Math.floor(index / 50) % 3 !== 0
);
const alignedDense = [
  large,
  large.map(([x, y]) => [x, y * 0.75 + 20] as [number, number]),
] as const;
const alignedMostlyGaps = [
  largeMostlyGaps,
  withGaps(large, (index) => Math.floor(index / 40) % 5 !== 0),
] as const;

describe("downSampleLineData", () => {
  test("min/max small (1k points)", async ({ bench }) => {
    await bench("min/max small (1k points)", () => {
      downSampleLineData(small, MAX_DETAILS);
    }).run();
  });

  test("min/max medium (10k points)", async ({ bench }) => {
    await bench("min/max medium (10k points)", () => {
      downSampleLineData(medium, MAX_DETAILS);
    }).run();
  });

  test("min/max large (100k points)", async ({ bench }) => {
    await bench("min/max large (100k points)", () => {
      downSampleLineData(large, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("mean large (100k points)", async ({ bench }) => {
    await bench("mean large (100k points)", () => {
      downSampleLineData(large, MAX_DETAILS, undefined, undefined, true);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("min/max large object points (100k points)", async ({ bench }) => {
    await bench("min/max large object points (100k points)", () => {
      downSampleLineData(largeObjects, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("min/max large with a few gaps (100k points)", async ({ bench }) => {
    await bench("min/max large with a few gaps (100k points)", () => {
      downSampleLineData(largeFewGaps, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("min/max large mostly gaps (100k points)", async ({ bench }) => {
    await bench("min/max large mostly gaps (100k points)", () => {
      downSampleLineData(largeMostlyGaps, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("aligned stack min/max dense (2x100k points)", async ({ bench }) => {
    await bench("aligned stack min/max dense (2x100k points)", () => {
      downSampleAlignedLineData(alignedDense, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });

  test("aligned stack min/max mostly gaps (2x100k points)", async ({
    bench,
  }) => {
    await bench("aligned stack min/max mostly gaps (2x100k points)", () => {
      downSampleAlignedLineData(alignedMostlyGaps, MAX_DETAILS);
    }).run({ time: 1000, warmupIterations: 2 });
  });
});
