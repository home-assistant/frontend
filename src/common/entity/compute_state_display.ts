import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { FrontendLocaleData } from "../../data/translation";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import { formatNumber } from "../string/format_number";
import { LocalizeFunc } from "../translations/localize";
import { computeStateDomain } from "./compute_state_domain";

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  state?: string
): string => {
  const compareState = state !== undefined ? state : stateObj.state;

  if (compareState === UNKNOWN || compareState === UNAVAILABLE) {
    return localize(`state.default.${compareState}`);
  }

  if (stateObj.attributes.unit_of_measurement) {
    return `${formatNumber(compareState, locale)} ${
      stateObj.attributes.unit_of_measurement
    }`;
  }

  const domain = computeStateDomain(stateObj);

  if (domain === "input_datetime") {
    if (state) {
      // If trying to display an explicit state, need to parse the explict state to `Date` then format.
      try {
        if (!stateObj.attributes.has_time) {
          // Only has date.
          const dateObj = new Date(state);
          const timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
          const adjustedDateObj = new Date(dateObj.getTime() + timezoneOffset);
          return formatDate(adjustedDateObj, locale);
        }
        if (!stateObj.attributes.has_date) {
          // Only has time.
          const now = new Date();
          const dateTiemString = now.toDateString() + " " + state;
          const dateObj = new Date(dateTiemString);
          return formatTime(dateObj, locale);
        }
        // Has both date and time
        const dateObj = new Date(state);
        return formatDateTime(dateObj, locale);
      } catch {
        // If `Date` constructor throws error, meaning the explict state isn't a valid date/time string,
        // just return it.
        return state;
      }
    } else {
      // If not trying to display an explicit state, just format `stateObj.state`.
      let date: Date;
      if (!stateObj.attributes.has_time) {
        date = new Date(
          stateObj.attributes.year,
          stateObj.attributes.month - 1,
          stateObj.attributes.day
        );
        return formatDate(date, locale);
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
        return formatTime(date, locale);
      }

      date = new Date(
        stateObj.attributes.year,
        stateObj.attributes.month - 1,
        stateObj.attributes.day,
        stateObj.attributes.hour,
        stateObj.attributes.minute
      );
      return formatDateTime(date, locale);
    }
  }

  if (domain === "humidifier") {
    if (compareState === "on" && stateObj.attributes.humidity) {
      return `${stateObj.attributes.humidity} %`;
    }
  }

  // `counter` `number` and `input_number` domains do not have a unit of measurement but should still use `formatNumber`
  if (
    domain === "counter" ||
    domain === "number" ||
    domain === "input_number"
  ) {
    return formatNumber(compareState, locale);
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
