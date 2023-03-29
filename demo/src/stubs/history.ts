import { HassEntity } from "home-assistant-js-websocket";
import { HistoryStates } from "../../../src/data/history";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

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

        states[entityId] = generateStateHistory(
          state,
          Array.from({ length: statesToGenerate }, genFunc),
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

      return () => {};
    }
  );
};
