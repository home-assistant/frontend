import { addHours, differenceInHours } from "date-fns";
import { HassEntity } from "home-assistant-js-websocket";
import { StatisticValue } from "../../../src/data/history";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

interface HistoryQueryParams {
  filter_entity_id: string;
  end_time: string;
}

const parseQuery = <T>(queryString: string) => {
  const query: any = {};
  const items = queryString.split("&");
  for (const item of items) {
    const parts = item.split("=");
    const key = decodeURIComponent(parts[0]);
    const value = parts.length > 1 ? decodeURIComponent(parts[1]) : undefined;
    query[key] = value;
  }
  return query as T;
};

const getTime = (minutesAgo) => {
  const ts = new Date(Date.now() - minutesAgo * 60 * 1000);
  return ts.toISOString();
};

const randomTimeAdjustment = (diff) => Math.random() * diff - diff / 2;

const maxTime = 1440;

const generateHistory = (state, deltas) => {
  const changes =
    typeof deltas[0] === "object"
      ? deltas
      : deltas.map((st) => ({ state: st }));

  const timeDiff = 900 / changes.length;

  return changes.map((change, index) => {
    let attributes;
    if (!change.attributes && !state.attributes) {
      attributes = {};
    } else if (!change.attributes) {
      attributes = state.attributes;
    } else if (!state.attributes) {
      attributes = change.attributes;
    } else {
      attributes = { ...state.attributes, ...change.attributes };
    }

    const time =
      index === 0
        ? getTime(maxTime)
        : getTime(maxTime - index * timeDiff + randomTimeAdjustment(timeDiff));

    return {
      attributes,
      entity_id: state.entity_id,
      state: change.state || state.state,
      last_changed: time,
      last_updated: time,
    };
  });
};

const incrementalUnits = ["clients", "queries", "ads"];

const generateMeanStatistics = (
  id: string,
  start: Date,
  end: Date,
  initValue: number,
  maxDiff: number
) => {
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
      mean,
      min: mean,
      max: mean,
      last_reset: "1970-01-01T00:00:00+00:00",
      state: mean,
      sum: null,
    });
    lastVal = mean;
    currentDate = addHours(currentDate, 1);
  }
  return statistics;
};

const generateSumStatistics = (
  id: string,
  start: Date,
  end: Date,
  initValue: number,
  maxDiff: number
) => {
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
      mean: null,
      min: null,
      max: null,
      last_reset: "1970-01-01T00:00:00+00:00",
      state: initValue + sum,
      sum,
    });
    currentDate = addHours(currentDate, 1);
  }
  return statistics;
};

const generateCurvedStatistics = (
  id: string,
  start: Date,
  end: Date,
  initValue: number,
  maxDiff: number,
  metered: boolean
) => {
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
  (id: string, start: Date, end: Date) => StatisticValue[]
> = {
  "sensor.energy_consumption_tarif_1": (id: string, start: Date, end: Date) => {
    const morningEnd = new Date(start.getTime() + 10 * 60 * 60 * 1000);
    const morningLow = generateSumStatistics(id, start, morningEnd, 0, 0.7);
    const eveningStart = new Date(start.getTime() + 20 * 60 * 60 * 1000);
    const eveningLow = generateSumStatistics(
      id,
      eveningStart,
      end,
      morningLow.length ? morningLow[morningLow.length - 1].sum! : 0,
      0.7
    );
    return [...morningLow, ...eveningLow];
  },
  "sensor.energy_consumption_tarif_2": (
    id: string,
    start: Date,
    _end: Date
  ) => {
    const morningEnd = new Date(start.getTime() + 9 * 60 * 60 * 1000);
    const eveningStart = new Date(start.getTime() + 20 * 60 * 60 * 1000);
    return generateSumStatistics(id, morningEnd, eveningStart, 0, 0.3);
  },
  "sensor.energy_production_tarif_1": () => [],
  "sensor.energy_production_tarif_1_compensation": () => [],
  "sensor.energy_production_tarif_2": (id, start, _end) => {
    const productionStart = new Date(start.getTime() + 9 * 60 * 60 * 1000);
    const productionEnd = new Date(start.getTime() + 21 * 60 * 60 * 1000);
    return generateCurvedStatistics(
      id,
      productionStart,
      productionEnd,
      0,
      0.15,
      true
    );
  },
  "sensor.solar_production": (id, start, _end) => {
    const productionStart = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const productionEnd = new Date(start.getTime() + 23 * 60 * 60 * 1000);
    return generateCurvedStatistics(
      id,
      productionStart,
      productionEnd,
      0,
      0.3,
      true
    );
  },
  "sensor.grid_fossil_fuel_percentage": (id, start, end) =>
    generateMeanStatistics(id, start, end, 35, 1.3),
};

export const mockHistory = (mockHass: MockHomeAssistant) => {
  mockHass.mockAPI(
    new RegExp("history/period/.+"),
    (hass, _method, path, _parameters) => {
      const params = parseQuery<HistoryQueryParams>(path.split("?")[1]);
      const entities = params.filter_entity_id.split(",");

      const results: HassEntity[][] = [];

      for (const entityId of entities) {
        const state = hass.states[entityId];

        if (!state) {
          continue;
        }

        if (!state.attributes.unit_of_measurement) {
          results.push(generateHistory(state, [state.state]));
          continue;
        }

        const numberState = Number(state.state);

        if (isNaN(numberState)) {
          // eslint-disable-next-line no-console
          console.log(
            "Ignoring state with unparsable state but with a unit",
            entityId,
            state
          );
          continue;
        }

        const statesToGenerate = 15;
        let genFunc;

        if (incrementalUnits.includes(state.attributes.unit_of_measurement)) {
          let initial = Math.floor(
            numberState * 0.4 + numberState * Math.random() * 0.2
          );
          const diff = Math.max(
            1,
            Math.floor((numberState - initial) / statesToGenerate)
          );
          genFunc = () => {
            initial += diff;
            return Math.min(numberState, initial);
          };
        } else {
          const diff = Math.floor(
            numberState * (numberState > 80 ? 0.05 : 0.5)
          );
          genFunc = () =>
            numberState - diff + Math.floor(Math.random() * 2 * diff);
        }

        results.push(
          generateHistory(
            {
              entity_id: state.entity_id,
              attributes: state.attributes,
            },
            Array.from({ length: statesToGenerate }, genFunc)
          )
        );
      }
      return results;
    }
  );
  mockHass.mockWS(
    "history/statistics_during_period",
    ({ statistic_ids, start_time, end_time }, hass) => {
      const start = new Date(start_time);
      const end = new Date(end_time);

      const statistics: Record<string, StatisticValue[]> = {};

      statistic_ids.forEach((id: string) => {
        if (id in statisticsFunctions) {
          statistics[id] = statisticsFunctions[id](id, start, end);
        } else {
          const entityState = hass.states[id];
          const state = entityState ? Number(entityState.state) : 1;
          statistics[id] =
            entityState && "last_reset" in entityState.attributes
              ? generateSumStatistics(
                  id,
                  start,
                  end,
                  state,
                  state * (state < 80 ? 0.05 : 0.5)
                )
              : generateMeanStatistics(
                  id,
                  start,
                  end,
                  state,
                  state * (state < 80 ? 0.05 : 0.5)
                );
        }
      });
      return statistics;
    }
  );
};
