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

const small = generatePoints(1, SCALES.small);
const medium = generatePoints(2, SCALES.medium);
const large = generatePoints(3, SCALES.large);
const largeObjects = large.map((value) => ({ value }));

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
});
