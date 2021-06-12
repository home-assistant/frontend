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

  // Below logic for `input_datetime` works only if the frontend's (browser's) timezone is the same as core's.
  // If frontend's timezone is different from core's, `input_datetime`s' state display computation will be incorrect.
  // Needs further fixes for frontend to get core's timezone offset, in order to make computation correct all the time.
  if (domain === "input_datetime") {
    if (state) {
      // If trying to display an explicit state, need to parse the explict state to `Date` then format.
      // Attributes aren't available, we have to use `state`.
      try {
        if (!stateObj.attributes.has_time) {
          // Only has date.
          const dateObj = new Date(state);
          // When only date is passed to `Date` constructor, it uses UTC regardless of frontend's timezone,
          // so we need to add the frontend's timezone offset.
          // Other usages of `Date` constructor have both date and time in the string, frontend's timezone is used w/o problem.
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
        // Has both date and time.
        const dateObj = new Date(state);
        return formatDateTime(dateObj, locale);
      } catch {
        // If `Date` constructor throws error, meaning the explict state isn't a valid date/time string,
        // just return it.
        return state;
      }
    } else {
      // If not trying to display an explicit state, create `Date` object from `stateObj`'s attributes then format.
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
