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
      // Attributes aren't available, we have to use `state`.
      try {
        const timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
        const components = state.split(" ");
        if (components.length === 2) {
          // Date and time.
          const iso8601String = components.join("T") + "Z";
          const dateObj = new Date(iso8601String);
          const adjustedDateObj = new Date(dateObj.getTime() + timezoneOffset);
          return formatDateTime(adjustedDateObj, locale);
        }
        if (components.length === 1) {
          if (state.includes("-")) {
            // Date only.
            const dateObj = new Date(state);
            const adjustedDateObj = new Date(
              dateObj.getTime() + timezoneOffset
            );
            return formatDate(adjustedDateObj, locale);
          }
          if (state.includes(":")) {
            // Time only.
            const now = new Date();
            const dateISO8601String =
              now.toISOString().substring(0, 10) + "T" + state + "Z";
            const dateObj = new Date(dateISO8601String);
            const adjustedDateObj = new Date(
              dateObj.getTime() + timezoneOffset
            );
            return formatTime(adjustedDateObj, locale);
          }
        }
        return state;
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
        date = new Date();
        date.setHours(stateObj.attributes.hour, stateObj.attributes.minute);
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
