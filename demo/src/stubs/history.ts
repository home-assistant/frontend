import type { HassEntity } from "home-assistant-js-websocket";
import type { HistoryStates } from "../../../src/data/history";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { driftedValue, hashFraction } from "./drift";

const generateStateHistory = (
  state: HassEntity,
  deltas,
  start_date: Date,
  end_date: Date
) => {
  const changes =
    typeof deltas[0] === "object"
      ? deltas
      : deltas.map((st) => ({ state: st }));

  const timeDiff = (end_date.getTime() - start_date.getTime()) / changes.length;

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

    const time = start_date.getTime() + timeDiff * index;

    return {
      a: attributes,
      s: change.state || state.state,
      lc: time / 1000,
      lu: time / 1000,
    };
  });
};

const incrementalUnits = ["clients", "queries", "ads"];

// Changes over the range of an on/off entity, ending in its state
const ON_OFF_CHANGES = 6;

// The most points of a number over the range
const NUMBER_POINTS = 96;

// An on/off entity, such as a light, switches a few times over the range, at
// times picked from its entity ID, and ends in its state
const generateOnOffHistory = (
  state: HassEntity,
  start: Date,
  end: Date
): HistoryStates[string] => {
  const span = end.getTime() - start.getTime();
  const opposite = state.state === "on" ? "off" : "on";

  return Array.from({ length: ON_OFF_CHANGES }, (_, index) => {
    const time =
      index === 0
        ? start.getTime()
        : start.getTime() +
          (span *
            (index - 0.3 + 0.6 * hashFraction(`${state.entity_id}:${index}`))) /
            ON_OFF_CHANGES;

    return {
      a: state.attributes,
      s: (ON_OFF_CHANGES - 1 - index) % 2 === 0 ? state.state : opposite,
      lc: time / 1000,
      lu: time / 1000,
    };
  });
};

// A number drifts around its state over the range, the same on every load,
// with as many decimals as its state, and ends in its state
const generateNumberHistory = (
  state: HassEntity,
  value: number,
  start: Date,
  end: Date
): HistoryStates[string] => {
  const decimals = Math.max(state.state.split(".")[1]?.length ?? 0, 1);

  const step = Math.max(
    (end.getTime() - start.getTime()) / NUMBER_POINTS,
    5 * 60 * 1000
  );

  const history: HistoryStates[string] = [];

  for (let time = start.getTime(); time < end.getTime(); time += step) {
    history.push({
      a: state.attributes,
      s: driftedValue(state.entity_id, time, value).toFixed(decimals),
      lc: time / 1000,
      lu: time / 1000,
    });
  }

  history.push({
    a: state.attributes,
    s: state.state,
    lc: end.getTime() / 1000,
    lu: end.getTime() / 1000,
  });

  return history;
};

export const mockHistory = (mockHass: MockHomeAssistant) => {
  mockHass.mockWS(
    "history/stream",
    (
      {
        entity_ids,
        start_time,
        end_time,
      }: {
        entity_ids: string[];
        start_time: string;
        end_time?: string;
      },
      hass,
      onChange
    ) => {
      const states: HistoryStates = {};

      const start = new Date(start_time);
      const end = end_time ? new Date(end_time) : new Date();

      for (const entityId of entity_ids) {
        states[entityId] = [];

        const state = hass.states[entityId];

        if (!state) {
          continue;
        }

        if (state.state === "on" || state.state === "off") {
          states[entityId] = generateOnOffHistory(state, start, end);
          continue;
        }

        if (!state.attributes.unit_of_measurement) {
          states[entityId] = generateStateHistory(
            state,
            [state.state],
            start,
            end
          );
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

        if (!incrementalUnits.includes(state.attributes.unit_of_measurement)) {
          states[entityId] = generateNumberHistory(
            state,
            numberState,
            start,
            end
          );
          continue;
        }

        // A counter climbs to its state
        const statesToGenerate = 15;

        let initial = Math.floor(
          numberState * 0.4 + numberState * Math.random() * 0.2
        );

        const diff = Math.max(
          1,
          Math.floor((numberState - initial) / statesToGenerate)
        );

        states[entityId] = generateStateHistory(
          state,
          Array.from({ length: statesToGenerate }, () => {
            initial += diff;

            return Math.min(numberState, initial);
          }),
          start,
          end
        );
      }

      setTimeout(() => {
        onChange?.({
          states,
          start_time: start,
          end_time: end,
        });
      }, 1);

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
  );
};
