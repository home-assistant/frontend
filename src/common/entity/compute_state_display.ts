import { HassEntity } from "home-assistant-js-websocket";
import computeStateDomain from "./compute_state_domain";
import formatDateTime from "../datetime/format_date_time";
import formatDate from "../datetime/format_date";
import formatTime from "../datetime/format_time";
import { LocalizeFunc } from "../../mixins/localize-base-mixin";

type CachedDisplayEntity = HassEntity & {
  _stateDisplay?: string;
};

export default function computeStateDisplay(
  localize: LocalizeFunc,
  stateObj: HassEntity,
  language: string
) {
  const state = stateObj as CachedDisplayEntity;
  if (!state._stateDisplay) {
    const domain = computeStateDomain(state);
    if (domain === "binary_sensor") {
      // Try device class translation, then default binary sensor translation
      if (state.attributes.device_class) {
        state._stateDisplay = localize(
          `state.${domain}.${state.attributes.device_class}.${state.state}`
        );
      }
      if (!state._stateDisplay) {
        state._stateDisplay = localize(
          `state.${domain}.default.${state.state}`
        );
      }
    } else if (
      state.attributes.unit_of_measurement &&
      !["unknown", "unavailable"].includes(state.state)
    ) {
      state._stateDisplay =
        state.state + " " + state.attributes.unit_of_measurement;
    } else if (domain === "input_datetime") {
      let date;
      if (!state.attributes.has_time) {
        date = new Date(
          state.attributes.year,
          state.attributes.month - 1,
          state.attributes.day
        );
        state._stateDisplay = formatDate(date, language);
      } else if (!state.attributes.has_date) {
        const now = new Date();
        date = new Date(
          // Due to bugs.chromium.org/p/chromium/issues/detail?id=797548
          // don't use artificial 1970 year.
          now.getFullYear(),
          now.getMonth(),
          now.getDay(),
          state.attributes.hour,
          state.attributes.minute
        );
        state._stateDisplay = formatTime(date, language);
      } else {
        date = new Date(
          state.attributes.year,
          state.attributes.month - 1,
          state.attributes.day,
          state.attributes.hour,
          state.attributes.minute
        );
        state._stateDisplay = formatDateTime(date, language);
      }
    } else if (domain === "zwave") {
      if (["initializing", "dead"].includes(state.state)) {
        state._stateDisplay = localize(
          `state.zwave.query_stage.${state.state}`,
          "query_stage",
          state.attributes.query_stage
        );
      } else {
        state._stateDisplay = localize(`state.zwave.default.${state.state}`);
      }
    } else {
      state._stateDisplay = localize(`state.${domain}.${state.state}`);
    }
    // Fall back to default, component backend translation, or raw state if nothing else matches.
    state._stateDisplay =
      state._stateDisplay ||
      localize(`state.default.${state.state}`) ||
      localize(`component.${domain}.state.${state.state}`) ||
      state.state;
  }

  return state._stateDisplay;
}
