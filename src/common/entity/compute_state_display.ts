import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import { LocalizeFunc } from "../translations/localize";
import { computeStateDomain } from "./compute_state_domain";
import { formatNumber } from "../string/format_number";

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  language: string,
  state?: string
): string => {
  const compareState = state !== undefined ? state : stateObj.state;

  if (compareState === UNKNOWN || compareState === UNAVAILABLE) {
    return localize(`state.default.${compareState}`);
  }

  if (stateObj.attributes.unit_of_measurement) {
    return `${formatNumber(compareState, language)} ${
      stateObj.attributes.unit_of_measurement
    }`;
  }

  const domain = computeStateDomain(stateObj);

  if (domain === "input_datetime") {
    let date: Date;
    if (!stateObj.attributes.has_time) {
      date = new Date(compareState);
      return formatDate(date, language);
    }
    if (!stateObj.attributes.has_date) {
      const parts = compareState.split(":").map(Number);
      date = new Date();
      date.setHours(parts[0], parts[1], parts[2]);
      return formatTime(date, language);
    }

    // For datetime, we have to ensure that we have an ISO date with the
    // "T" separator to prevent issues on iOS and macOS.
    date = new Date(compareState.replace(" ", "T"));
    return formatDateTime(date, language);
  }

  if (domain === "humidifier") {
    if (compareState === "on" && stateObj.attributes.humidity) {
      return `${stateObj.attributes.humidity}%`;
    }
  }

  if (domain === "counter") {
    return formatNumber(compareState, language);
  }

  return (
    // Return device class translation
    (stateObj.attributes.device_class &&
      localize(
        `component.${domain}.state.${stateObj.attributes.device_class}.${compareState}`
      )) ||
    // Return default translation
    localize(`component.${domain}.state._.${compareState}`) ||
    // We don't know! Return the raw state.
    compareState
  );
};
