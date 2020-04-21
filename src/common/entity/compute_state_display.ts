import { HassEntity } from "home-assistant-js-websocket";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import { LocalizeFunc } from "../translations/localize";
import { computeStateDomain } from "./compute_state_domain";
import { UNKNOWN, UNAVAILABLE } from "../../data/entity";

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  language: string
): string => {
  if (stateObj.state === UNKNOWN || stateObj.state === UNAVAILABLE) {
    return localize(`state.default.${stateObj.state}`);
  }

  if (stateObj.attributes.unit_of_measurement) {
    return `${stateObj.state} ${stateObj.attributes.unit_of_measurement}`;
  }

  const domain = computeStateDomain(stateObj);

  if (domain === "input_datetime") {
    let date: Date;
    if (!stateObj.attributes.has_time) {
      date = new Date(
        stateObj.attributes.year,
        stateObj.attributes.month - 1,
        stateObj.attributes.day
      );
      return formatDate(date, language);
    }
    if (!stateObj.attributes.has_date) {
      const now = new Date();
      date = new Date(
        // Due to bugs.chromium.org/p/chromium/issues/detail?id=797548
        // don't use artificial 1970 year.
        now.getFullYear(),
        now.getMonth(),
        now.getDay(),
        stateObj.attributes.hour,
        stateObj.attributes.minute
      );
      return formatTime(date, language);
    }

    date = new Date(
      stateObj.attributes.year,
      stateObj.attributes.month - 1,
      stateObj.attributes.day,
      stateObj.attributes.hour,
      stateObj.attributes.minute
    );
    return formatDateTime(date, language);
  }

  const deviceClass = stateObj.attributes.device_class || "_";
  return (
    localize(`component.${domain}.state.${deviceClass}.${stateObj.state}`) ||
    stateObj.state
  );
};
