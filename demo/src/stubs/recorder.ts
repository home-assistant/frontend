import { TZDate } from "@date-fns/tz";
import type { Day } from "date-fns";
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  constructFrom,
  differenceInHours,
  endOfDay,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket";
import type { HaDurationData } from "../../../src/components/ha-duration-input";
import type {
  Statistic,
  Statistics,
  StatisticsMetaData,
  StatisticValue,
} from "../../../src/data/recorder";
import { StatisticMeanType } from "../../../src/data/recorder";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { driftedValue, driftScale, hashFraction } from "./drift";

const getFirstDate = (
  start: Date,
  period: "5minute" | "hour" | "day" | "month"
): Date => {
  if (period === "day" || period === "month") {
    return constructFrom(start, start);
  }
  // Core returns UTC-aligned buckets whose start is at or after the request.
  const interval = (period === "hour" ? 60 : 5) * 60 * 1000;
  return constructFrom(start, Math.ceil(start.getTime() / interval) * interval);
};

const getNextDate = (
  currentDate: Date,
  period: "5minute" | "hour" | "day" | "month"
): Date => {
  return period === "day"
    ? addDays(currentDate, 1)
    : period === "month"
      ? addMonths(currentDate, 1)
      : period === "hour"
        ? addHours(currentDate, 1)
        : addMinutes(currentDate, 5);
};

// The mean of each period drifts around the entity's state, as its history
// does, and the same on every load. Longer periods span more of the drift.
const generateMeanStatistics = (
  id: string,
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour",
  value: number
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];

  const spread =
    driftScale(value) * (period === "5minute" || period === "hour" ? 0.2 : 0.8);

  let currentDate = getFirstDate(start, period);
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const nextDate = getNextDate(currentDate, period);

    const mean = driftedValue(
      id,
      (currentDate.getTime() + nextDate.getTime()) / 2,
      value
    );
    statistics.push({
      start: currentDate.getTime(),
      end: nextDate.getTime(),
      mean,
      min: mean - spread,
      max: mean + spread,
      last_reset: 0,
      state: mean,
      sum: null,
    });
    currentDate = nextDate;
  }
  return statistics;
};

const generateSumStatistics = (
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour",
  initValue: number,
  maxDiff: number | ((start: Date, end: Date) => number),
  // A number from 0 up to 1 for each period's share of maxDiff
  random: (periodStart: Date) => number = () => Math.random()
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];
  let currentDate = getFirstDate(start, period);
  let sum = initValue;
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const nextDate = getNextDate(currentDate, period);
    const bound =
      typeof maxDiff === "function" ? maxDiff(currentDate, nextDate) : maxDiff;

    const add = random(currentDate) * bound;
    sum += add;
    statistics.push({
      start: currentDate.getTime(),
      end: nextDate.getTime(),
      mean: null,
      min: null,
      max: null,
      last_reset: 0,
      change: add,
      state: initValue + sum,
      sum,
    });
    currentDate = nextDate;
  }
  return statistics;
};

const generateCurvedStatistics = (
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour",
  initValue: number,
  maxDiff: number,
  metered: boolean
): StatisticValue[] => {
  const statistics: StatisticValue[] = [];
  let currentDate = getFirstDate(start, period);
  let sum = initValue;
  const hours = differenceInHours(end, start) - 1;
  let i = 0;
  let half = false;
  const now = new Date();
  while (end > currentDate && currentDate < now) {
    const nextDate = getNextDate(currentDate, period);
    const add = i * (Math.random() * maxDiff);
    sum += add;
    statistics.push({
      start: currentDate.getTime(),
      end: nextDate.getTime(),
      mean: null,
      min: null,
      max: null,
      last_reset: 0,
      change: add,
      state: initValue + sum,
      sum: metered ? sum : null,
    });
    currentDate = nextDate;
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
  "sensor.energy_water": (_id, start, end, period = "hour") =>
    generateSumStatistics(
      start,
      end,
      period,
      4000,
      (bucketStart, bucketEnd) =>
        (20 * (bucketEnd.getTime() - bucketStart.getTime())) / 3600000
    ),
  "sensor.gas_kitchen": (_id, start, end, period = "hour") =>
    generateSumStatistics(
      start,
      end,
      period,
      100,
      (bucketStart, bucketEnd) =>
        (0.1 * (bucketEnd.getTime() - bucketStart.getTime())) / 3600000
    ),
  "sensor.gas_heat_pump": (_id, start, end, period = "hour") =>
    generateSumStatistics(
      start,
      end,
      period,
      500,
      (bucketStart, bucketEnd) =>
        (0.6 * (bucketEnd.getTime() - bucketStart.getTime())) / 3600000
    ),
  "sensor.energy_consumption_tarif_1": (
    _id: string,
    start: Date,
    end: Date,
    period = "hour"
  ) => {
    if (period !== "hour") {
      return generateSumStatistics(
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const morningEnd = addHours(start, 10);
    const morningLow = generateSumStatistics(start, morningEnd, period, 0, 0.7);
    const eveningStart = addHours(start, 20);
    const morningFinalVal = morningLow.length
      ? morningLow[morningLow.length - 1].sum!
      : 0;
    const empty = generateSumStatistics(
      morningEnd,
      eveningStart,
      period,
      morningFinalVal,
      0
    );
    const eveningLow = generateSumStatistics(
      eveningStart,
      end,
      period,
      morningFinalVal,
      0.7
    );
    return [...morningLow, ...empty, ...eveningLow];
  },
  "sensor.energy_consumption_tarif_2": (
    _id: string,
    start: Date,
    end: Date,
    period = "hour"
  ) => {
    if (period !== "hour") {
      return generateSumStatistics(
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const morningEnd = addHours(start, 9);
    const eveningStart = addHours(start, 20);
    const highTarif = generateSumStatistics(
      morningEnd,
      eveningStart,
      period,
      0,
      0.3
    );
    const highTarifFinalVal = highTarif.length
      ? highTarif[highTarif.length - 1].sum!
      : 0;
    const morning = generateSumStatistics(start, morningEnd, period, 0, 0);
    const evening = generateSumStatistics(
      eveningStart,
      end,
      period,
      highTarifFinalVal,
      0
    );
    return [...morning, ...highTarif, ...evening];
  },
  "sensor.energy_production_tarif_1": (_id, start, end, period = "hour") =>
    generateSumStatistics(start, end, period, 0, 0),
  "sensor.energy_production_tarif_1_compensation": (
    _id,
    start,
    end,
    period = "hour"
  ) => generateSumStatistics(start, end, period, 0, 0),
  "sensor.energy_production_tarif_2": (_id, start, end, period = "hour") => {
    if (period !== "hour") {
      return generateSumStatistics(
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const productionStart = addHours(start, 9);
    const productionEnd = addHours(start, 21);
    const dayEnd = constructFrom(
      end,
      Math.min(endOfDay(productionEnd).getTime(), end.getTime())
    );
    const production = generateCurvedStatistics(
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
    const morning = generateSumStatistics(start, productionStart, period, 0, 0);
    const evening = generateSumStatistics(
      productionEnd,
      dayEnd,
      period,
      productionFinalVal,
      0
    );
    const rest = generateSumStatistics(
      dayEnd,
      end,
      period,
      productionFinalVal,
      1
    );
    return [...morning, ...production, ...evening, ...rest];
  },
  "sensor.solar_production": (_id, start, end, period = "hour") => {
    if (period !== "hour") {
      return generateSumStatistics(
        start,
        end,
        period,
        0,
        period === "day" ? 17 : 504
      );
    }
    const productionStart = addHours(start, 7);
    const productionEnd = addHours(start, 23);
    const dayEnd = constructFrom(
      end,
      Math.min(endOfDay(productionEnd).getTime(), end.getTime())
    );
    const production = generateCurvedStatistics(
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
    const morning = generateSumStatistics(start, productionStart, period, 0, 0);
    const evening = generateSumStatistics(
      productionEnd,
      dayEnd,
      period,
      productionFinalVal,
      0
    );
    const rest = generateSumStatistics(
      dayEnd,
      end,
      period,
      productionFinalVal,
      0.2
    );
    return [...morning, ...production, ...evening, ...rest];
  },
};
// Prices are per source unit; water uses litres (4 currency units per m³).
const derivedCosts: Record<string, { source: string; price: number }> = {
  "sensor.energy_water_cost": { source: "sensor.energy_water", price: 0.004 },
};
// Battery directions as a share of the meter the energy also passes, so they
// never exceed it
const derivedBatteryFlows: Record<string, { source: string; share: number }> = {
  "sensor.powerwall_from_grid": {
    source: "sensor.energy_consumption_tarif_1",
    share: 0.4,
  },
  "sensor.powerwall_from_solar": {
    source: "sensor.solar_production",
    share: 0.3,
  },
  "sensor.powerwall_to_home": {
    source: "sensor.energy_consumption_tarif_2",
    share: 0.5,
  },
  "sensor.powerwall_to_grid": {
    source: "sensor.energy_production_tarif_2",
    share: 0.3,
  },
};

const hasSum = (stateObj: HassEntity | undefined): boolean =>
  stateObj?.attributes.state_class === "total" ||
  stateObj?.attributes.state_class === "total_increasing";

const getStatistics = (
  hass: MockHomeAssistant,
  statisticIds: string[],
  start: Date,
  end: Date,
  period: "5minute" | "hour" | "day" | "month"
): Statistics => {
  const statistics: Record<string, StatisticValue[]> = {};
  const cache: Record<string, StatisticValue[]> = {};

  const getStats = (id: string) => {
    cache[id] ??= statisticsFunctions[id](id, start, end, period);

    return cache[id];
  };

  const scaleStats = (source: string, factor: number) => {
    let sum = 0;

    return getStats(source).map((statistic) => {
      const change = (statistic.change ?? 0) * factor;

      sum += change;

      return { ...statistic, change, state: sum, sum };
    });
  };

  statisticIds.forEach((id: string) => {
    if (id in derivedCosts) {
      const { source, price } = derivedCosts[id];

      statistics[id] = scaleStats(source, price);
    } else if (id in derivedBatteryFlows) {
      const { source, share } = derivedBatteryFlows[id];

      statistics[id] = scaleStats(source, share);
    } else if (id in statisticsFunctions) {
      statistics[id] = getStats(id);
    } else {
      const entityState = hass.states[id];

      // Like Core, only an entity with a state class has statistics, so the
      // history of a light has no empty chart of them
      if (entityState && !entityState.attributes.state_class) {
        return;
      }

      const state = entityState ? Number(entityState.state) : 1;

      // Each period's share is picked from the entity ID, so a meter's bars
      // are the same on every load
      statistics[id] = hasSum(entityState)
        ? generateSumStatistics(
            start,
            end,
            period,
            state,
            state * (state > 80 ? 0.01 : 0.05),
            (periodStart) => hashFraction(`${id}:${periodStart.getTime()}`)
          )
        : generateMeanStatistics(id, start, end, period, state);
    }
  });

  return statistics;
};

const durationMs = (duration?: HaDurationData): number =>
  duration
    ? ((duration.days ?? 0) * 24 + (duration.hours ?? 0)) * 3600000 +
      (duration.minutes ?? 0) * 60000 +
      (duration.seconds ?? 0) * 1000 +
      (duration.milliseconds ?? 0)
    : 0;

const WEEK_STARTS = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
} satisfies Record<string, Day>;

interface StatisticDuringPeriodMessage {
  statistic_id: string;
  types?: string[];
  fixed_period?: { start_time?: string; end_time?: string };
  calendar?: {
    period: "hour" | "day" | "week" | "month" | "year";
    offset?: number;
    first_weekday?: keyof typeof WEEK_STARTS;
  };
  rolling_window?: { duration: HaDurationData; offset?: HaDurationData };
}

// The start and end of the period of recorder/statistic_during_period, as
// Core reads it, in the server timezone
const statisticPeriodBounds = (
  message: StatisticDuringPeriodMessage,
  timeZone: string
): [Date, Date] => {
  const now = new TZDate(Date.now(), timeZone);

  if (message.fixed_period) {
    const { start_time, end_time } = message.fixed_period;

    return [
      new TZDate(start_time ? Date.parse(start_time) : 0, timeZone),
      new TZDate(end_time ? Date.parse(end_time) : Date.now(), timeZone),
    ];
  }

  if (message.rolling_window) {
    const end = new TZDate(
      now.getTime() + durationMs(message.rolling_window.offset),
      timeZone
    );

    return [
      new TZDate(
        end.getTime() - durationMs(message.rolling_window.duration),
        timeZone
      ),
      end,
    ];
  }

  if (message.calendar) {
    const offset = message.calendar.offset ?? 0;

    switch (message.calendar.period) {
      case "hour": {
        const start = addHours(startOfHour(now), offset);

        return [start, addHours(start, 1)];
      }

      case "week": {
        const weekStartsOn =
          WEEK_STARTS[message.calendar.first_weekday ?? "mon"];

        const start = addWeeks(startOfWeek(now, { weekStartsOn }), offset);

        return [start, addWeeks(start, 1)];
      }

      case "month": {
        const start = addMonths(startOfMonth(now), offset);

        return [start, addMonths(start, 1)];
      }

      case "year": {
        const start = addYears(startOfYear(now), offset);

        return [start, addYears(start, 1)];
      }

      default: {
        const start = addDays(startOfDay(now), offset);

        return [start, addDays(start, 1)];
      }
    }
  }

  // All the history, which the mock makes up for the last day
  return [addDays(now, -1), now];
};

export const mockRecorder = (mockHass: MockHomeAssistant) => {
  mockHass.mockWS(
    "recorder/get_statistics_metadata",
    (
      { statistic_ids }: { statistic_ids?: string[] },
      hass
    ): StatisticsMetaData[] =>
      (statistic_ids ?? []).flatMap((id) => {
        const stateObj = hass.states[id];

        if (!stateObj?.attributes.state_class) {
          return [];
        }

        const sum = hasSum(stateObj);

        return [
          {
            statistic_id: id,
            source: "recorder",
            name: stateObj.attributes.friendly_name ?? null,
            statistics_unit_of_measurement:
              stateObj.attributes.unit_of_measurement ?? null,
            has_sum: sum,
            mean_type: sum
              ? StatisticMeanType.NONE
              : StatisticMeanType.ARITHMETIC,
            unit_class: null,
          },
        ];
      })
  );
  mockHass.mockWS(
    "recorder/list_statistic_ids",
    (): StatisticsMetaData[] => []
  );

  mockHass.mockWS(
    "recorder/statistics_during_period",
    ({ statistic_ids, start_time, end_time, period }, hass): Statistics =>
      // Calendar buckets follow the server timezone, independent of the browser.
      getStatistics(
        hass,
        statistic_ids,
        new TZDate(start_time, hass.config.time_zone),
        new TZDate(end_time ?? Date.now(), hass.config.time_zone),
        period
      )
  );

  // The statistic card asks for one number over a period: the mean, lowest,
  // highest or change of the hourly statistics in it
  mockHass.mockWS(
    "recorder/statistic_during_period",
    (message: StatisticDuringPeriodMessage, hass): Statistic => {
      const [start, end] = statisticPeriodBounds(
        message,
        hass.config.time_zone
      );

      // The energy demo's tariffs place their phases from the start they're
      // asked for, as the energy dashboard asks from midnight. So the hours
      // come from the start of the day, then only those inside the period
      // count. Like Core, an hour that runs past the end isn't counted, so a
      // day ending at 23:59:59.999 leaves out the hour from 23:00.
      const values = (
        getStatistics(
          hass,
          [message.statistic_id],
          startOfDay(start),
          end,
          "hour"
        )[message.statistic_id] ?? []
      ).filter(
        (value) => value.start >= start.getTime() && value.end <= end.getTime()
      );

      const numbers = (key: "mean" | "min" | "max" | "change") =>
        values.flatMap((value) => (value[key] == null ? [] : [value[key]]));

      const means = numbers("mean");
      const mins = numbers("min");
      const maxes = numbers("max");
      const changes = numbers("change");

      return {
        mean: means.length
          ? means.reduce((total, mean) => total + mean, 0) / means.length
          : null,
        // Reduced rather than spread, as a long period has more hours than a
        // call can take as arguments
        min: mins.length
          ? mins.reduce((lowest, min) => Math.min(lowest, min))
          : null,
        max: maxes.length
          ? maxes.reduce((highest, max) => Math.max(highest, max))
          : null,
        change: changes.length
          ? changes.reduce((total, change) => total + change, 0)
          : null,
      };
    }
  );
};
