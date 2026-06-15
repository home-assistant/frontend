import { bench, describe } from "vitest";
import {
  computeHistory,
  convertStatisticsToHistory,
  mergeHistoryResults,
} from "../../src/data/history";
import { createMockHass, mockLocalize } from "../fixtures/hass";
import {
  FIXED_EPOCH_MS,
  generateNumericSensorStates,
} from "../fixtures/history-states";
import { generateStatistics } from "../fixtures/statistics";

const hass = createMockHass();
const dayMs = 24 * 60 * 60 * 1000;

const idsFor = (count: number) =>
  Array.from({ length: count }, (_, i) => `sensor.temperature_${i}`);

const hourlyMonth = generateStatistics(1, {
  ids: idsFor(5),
  period: "hour",
  days: 31,
});
const fiveMinuteWeek = generateStatistics(2, {
  ids: idsFor(5),
  period: "5minute",
  days: 7,
});

const ltsResult = convertStatisticsToHistory(
  hass,
  generateStatistics(3, { ids: idsFor(10), period: "hour", days: 31 }),
  idsFor(10)
);
const recentStates = {};
idsFor(10).forEach((id, i) => {
  recentStates[id] = generateNumericSensorStates(100 + i, {
    count: 2_000,
    startMs: FIXED_EPOCH_MS + 31 * dayMs,
  });
});
const historyResult = computeHistory(hass, recentStates, [], mockLocalize);

describe("convertStatisticsToHistory", () => {
  bench("hourly statistics, month, 5 entities", () => {
    convertStatisticsToHistory(hass, hourlyMonth, idsFor(5));
  });

  bench("5-minute statistics, week, 5 entities", () => {
    convertStatisticsToHistory(hass, fiveMinuteWeek, idsFor(5));
  });
});

describe("mergeHistoryResults", () => {
  bench("month of LTS + recent history, 10 entities", () => {
    mergeHistoryResults(historyResult, ltsResult);
  });
});
