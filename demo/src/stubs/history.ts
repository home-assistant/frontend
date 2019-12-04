import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { HassEntity } from "home-assistant-js-websocket";

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

export const mockHistory = (mockHass: MockHomeAssistant) => {
  mockHass.mockAPI(
    new RegExp("history/period/.+"),
    (
      hass,
      // @ts-ignore
      method,
      path,
      // @ts-ignore
      parameters
    ) => {
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
          // tslint:disable-next-line
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
};
