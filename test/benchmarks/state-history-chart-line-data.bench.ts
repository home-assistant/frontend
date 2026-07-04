import { bench, describe } from "vitest";
import { generateStateHistoryChartLineData } from "../../src/components/chart/state-history-chart-line-data";
import { computeHistory } from "../../src/data/history";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { createMockHass, mockLocalize } from "../fixtures/hass";
import {
  FIXED_EPOCH_MS,
  generateClimateStates,
  generateMixedHistory,
} from "../fixtures/history-states";

const computedStyles = createMockComputedStyle();
const hass = createMockHass();
const dayMs = 24 * 60 * 60 * 1000;

const toLineChartEntities = (history) =>
  computeHistory(hass, history, [], mockLocalize).line.flatMap(
    (unit) => unit.data
  );

const medium = toLineChartEntities(generateMixedHistory(1, "medium"));
const large = toLineChartEntities(generateMixedHistory(2, "large"));
const climate = toLineChartEntities({
  "climate.thermostat": generateClimateStates(3, { count: 20_000 }),
});

const base = {
  hass,
  computedStyles,
  showNames: true,
  endTime: new Date(FIXED_EPOCH_MS + 30 * dayMs),
  now: new Date(FIXED_EPOCH_MS + 30 * dayMs),
} as const;

describe("generateStateHistoryChartLineData", () => {
  bench("mixed medium (10k states)", () => {
    generateStateHistoryChartLineData({ ...base, data: medium });
  });

  bench(
    "mixed large (100k states)",
    () => {
      generateStateHistoryChartLineData({ ...base, data: large });
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "climate entity (20k states)",
    () => {
      generateStateHistoryChartLineData({ ...base, data: climate });
    },
    { time: 1000, warmupIterations: 2 }
  );
});
