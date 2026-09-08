import { bench, describe } from "vitest";
import { downSampleLineData } from "../../src/components/chart/down-sample";
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

describe("downSampleLineData", () => {
  bench("min/max small (1k points)", () => {
    downSampleLineData(small, MAX_DETAILS);
  });

  bench("min/max medium (10k points)", () => {
    downSampleLineData(medium, MAX_DETAILS);
  });

  bench(
    "min/max large (100k points)",
    () => {
      downSampleLineData(large, MAX_DETAILS);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "mean large (100k points)",
    () => {
      downSampleLineData(large, MAX_DETAILS, undefined, undefined, true);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "min/max large object points (100k points)",
    () => {
      downSampleLineData(largeObjects, MAX_DETAILS);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "min/max large with a few gaps (100k points)",
    () => {
      downSampleLineData(largeFewGaps, MAX_DETAILS);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "min/max large mostly gaps (100k points)",
    () => {
      downSampleLineData(largeMostlyGaps, MAX_DETAILS);
    },
    { time: 1000, warmupIterations: 2 }
  );
});
