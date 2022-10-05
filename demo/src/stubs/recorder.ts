import {
  addDays,
  addHours,
  addMonths,
  differenceInHours,
  endOfDay,
} from "date-fns";
import {
  Statistics,
  StatisticsMetaData,
  StatisticValue,
} from "../../../src/data/recorder";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const generateMeanStatistics = (
  id: string,
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour",
  initValue: number,
  maxDiff: number
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];
  let currentDate = new Date(start);
  currentDate.setMinutes(0, 0, 0);
  let lastVal = initValue;
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const delta = Math.random() * maxDiff;
    const mean = lastVal + delta;
    statistics.push({
      statistic_id: id,
      start: currentDate.toISOString(),
      end: currentDate.toISOString(),
      mean,
      min: mean - Math.random() * maxDiff,
      max: mean + Math.random() * maxDiff,
      last_reset: "1970-01-01T00:00:00+00:00",
      state: mean,
      sum: null,
    });
    lastVal = mean;
    currentDate =
      period === "day"
        ? addDays(currentDate, 1)
        : period === "month"
        ? addMonths(currentDate, 1)
        : addHours(currentDate, 1);
  }
  return statistics;
};

const generateSumStatistics = (
  id: string,
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour",
  initValue: number,
  maxDiff: number
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];
  let currentDate = new Date(start);
  currentDate.setMinutes(0, 0, 0);
  let sum = initValue;
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const add = Math.random() * maxDiff;
    sum += add;
    statistics.push({
      statistic_id: id,
      start: currentDate.toISOString(),
      end: currentDate.toISOString(),
      mean: null,
      min: null,
      max: null,
      last_reset: "1970-01-01T00:00:00+00:00",
      state: initValue + sum,
      sum,
    });
    currentDate =
      period === "day"
        ? addDays(currentDate, 1)
        : period === "month"
        ? addMonths(currentDate, 1)
        : addHours(currentDate, 1);
  }
  return statistics;
};

const generateCurvedStatistics = (
  id: string,
  start: Date,
  end: Date,
  _period: "5minute" | "hour" | "day" | "month" = "hour",
  initValue: number,
  maxDiff: number,
  metered: boolean
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];
  let currentDate = new Date(start);
  currentDate.setMinutes(0, 0, 0);
  let sum = initValue;
  const hours = differenceInHours(end, start) - 1;
  let i = 0;
  let half = false;
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const add = Math.random() * maxDiff;
    sum += i * add;
    statistics.push({
      statistic_id: id,
      start: currentDate.toISOString(),
      end: currentDate.toISOString(),
      mean: null,
      min: null,
      max: null,
      last_reset: "1970-01-01T00:00:00+00:00",
      state: initValue + sum,
      sum: metered ? sum : null,
    });
    currentDate = addHours(currentDate, 1);
    if (!half && i > hours / 2) {
      half = true;
    }
    i += half ? -1 : 1;
  }
  return statistics;
};

const statisticsFunctions: Record<
  string,
  (
    id: string,
    start: Date,
    end: Date,
    period: "5minute" | "hour" | "day" | "month"
  ) => StatisticValue[]
> = {
  "sensor.energy_consumption_tarif_1": (
    id: string,
    start: Date,
    end: Date,
    period = "hour"
  ) => {
    if (period !== "hour") {
      return generateSumStatistics(
        id,
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const morningEnd = new Date(start.getTime() + 10 * 60 * 60 * 1000);
    const morningLow = generateSumStatistics(
      id,
      start,
      morningEnd,
      period,
      0,
      0.7
    );
    const eveningStart = new Date(start.getTime() + 20 * 60 * 60 * 1000);
    const morningFinalVal = morningLow.length
      ? morningLow[morningLow.length - 1].sum!
      : 0;
    const empty = generateSumStatistics(
      id,
      morningEnd,
      eveningStart,
      period,
      morningFinalVal,
      0
    );
    const eveningLow = generateSumStatistics(
      id,
      eveningStart,
      end,
      period,
      morningFinalVal,
      0.7
    );
    return [...morningLow, ...empty, ...eveningLow];
  },
  "sensor.energy_consumption_tarif_2": (
    id: string,
    start: Date,
    end: Date,
    period = "hour"
  ) => {
    if (period !== "hour") {
      return generateSumStatistics(
        id,
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const morningEnd = new Date(start.getTime() + 9 * 60 * 60 * 1000);
    const eveningStart = new Date(start.getTime() + 20 * 60 * 60 * 1000);
    const highTarif = generateSumStatistics(
      id,
      morningEnd,
      eveningStart,
      period,
      0,
      0.3
    );
    const highTarifFinalVal = highTarif.length
      ? highTarif[highTarif.length - 1].sum!
      : 0;
    const morning = generateSumStatistics(id, start, morningEnd, period, 0, 0);
    const evening = generateSumStatistics(
      id,
      eveningStart,
      end,
      period,
      highTarifFinalVal,
      0
    );
    return [...morning, ...highTarif, ...evening];
  },
  "sensor.energy_production_tarif_1": (id, start, end, period = "hour") =>
    generateSumStatistics(id, start, end, period, 0, 0),
  "sensor.energy_production_tarif_1_compensation": (
    id,
    start,
    end,
    period = "hour"
  ) => generateSumStatistics(id, start, end, period, 0, 0),
  "sensor.energy_production_tarif_2": (id, start, end, period = "hour") => {
    if (period !== "hour") {
      return generateSumStatistics(
        id,
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const productionStart = new Date(start.getTime() + 9 * 60 * 60 * 1000);
    const productionEnd = new Date(start.getTime() + 21 * 60 * 60 * 1000);
    const dayEnd = new Date(endOfDay(productionEnd));
    const production = generateCurvedStatistics(
      id,
      productionStart,
      productionEnd,
      period,
      0,
      0.15,
      true
    );
    const productionFinalVal = production.length
      ? production[production.length - 1].sum!
      : 0;
    const morning = generateSumStatistics(
      id,
      start,
      productionStart,
      period,
      0,
      0
    );
    const evening = generateSumStatistics(
      id,
      productionEnd,
      dayEnd,
      period,
      productionFinalVal,
      0
    );
    const rest = generateSumStatistics(
      id,
      dayEnd,
      end,
      period,
      productionFinalVal,
      1
    );
    return [...morning, ...production, ...evening, ...rest];
  },
  "sensor.solar_production": (id, start, end, period = "hour") => {
    if (period !== "hour") {
      return generateSumStatistics(
        id,
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const productionStart = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const productionEnd = new Date(start.getTime() + 23 * 60 * 60 * 1000);
    const dayEnd = new Date(endOfDay(productionEnd));
    const production = generateCurvedStatistics(
      id,
      productionStart,
      productionEnd,
      period,
      0,
      0.3,
      true
    );
    const productionFinalVal = production.length
      ? production[production.length - 1].sum!
      : 0;
    const morning = generateSumStatistics(
      id,
      start,
      productionStart,
      period,
      0,
      0
    );
    const evening = generateSumStatistics(
      id,
      productionEnd,
      dayEnd,
      period,
      productionFinalVal,
      0
    );
    const rest = generateSumStatistics(
      id,
      dayEnd,
      end,
      period,
      productionFinalVal,
      2
    );
    return [...morning, ...production, ...evening, ...rest];
  },
};
export const mockRecorder = (mockHass: MockHomeAssistant) => {
  mockHass.mockWS(
    "recorder/get_statistics_metadata",
    (): StatisticsMetaData[] => []
  );
  mockHass.mockWS(
    "recorder/list_statistic_ids",
    (): StatisticsMetaData[] => []
  );
  mockHass.mockWS(
    "recorder/statistics_during_period",
    ({ statistic_ids, start_time, end_time, period }, hass): Statistics => {
      const start = new Date(start_time);
      const end = end_time ? new Date(end_time) : new Date();

      const statistics: Record<string, StatisticValue[]> = {};

      statistic_ids.forEach((id: string) => {
        if (id in statisticsFunctions) {
          statistics[id] = statisticsFunctions[id](id, start, end, period);
        } else {
          const entityState = hass.states[id];
          const state = entityState ? Number(entityState.state) : 1;
          statistics[id] =
            entityState && "last_reset" in entityState.attributes
              ? generateSumStatistics(
                  id,
                  start,
                  end,
                  period,
                  state,
                  state * (state > 80 ? 0.01 : 0.05)
                )
              : generateMeanStatistics(
                  id,
                  start,
                  end,
                  period,
                  state,
                  state * (state > 80 ? 0.05 : 0.1)
                );
        }
      });
      return statistics;
    }
  );
};
