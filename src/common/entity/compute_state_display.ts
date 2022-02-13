import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { FrontendLocaleData } from "../../data/translation";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import { formatNumber, isNumericState } from "../number/format_number";
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

  // Entities with a `unit_of_measurement` or `state_class` are numeric values and should use `formatNumber`
  if (isNumericState(stateObj)) {
    if (stateObj.attributes.device_class === "monetary") {
      try {
        return formatNumber(compareState, locale, {
          style: "currency",
          currency: stateObj.attributes.unit_of_measurement,
        });
      } catch (_err) {
        // fallback to default
      }
    }
    return `${formatNumber(compareState, locale)}${
      stateObj.attributes.unit_of_measurement
        ? " " + stateObj.attributes.unit_of_measurement
        : ""
    }`;
  }

  const domain = computeStateDomain(stateObj);

  if (domain === "input_datetime") {
    if (state !== undefined) {
      // If trying to display an explicit state, need to parse the explicit state to `Date` then format.
      // Attributes aren't available, we have to use `state`.
      try {
        const components = state.split(" ");
        if (components.length === 2) {
          // Date and time.
          return formatDateTime(new Date(components.join("T")), locale);
        }
        if (components.length === 1) {
          if (state.includes("-")) {
            // Date only.
            return formatDate(new Date(`${state}T00:00`), locale);
          }
          if (state.includes(":")) {
            // Time only.
            const now = new Date();
            return formatTime(
              new Date(`${now.toISOString().split("T")[0]}T${state}`),
              locale
            );
          }
        }
        return state;
      } catch (_e) {
        // Formatting methods may throw error if date parsing doesn't go well,
        // just return the state string in that case.
        return state;
      }
    } else {
      // If not trying to display an explicit state, create `Date` object from `stateObj`'s attributes then format.
      let date: Date;
      if (stateObj.attributes.has_date && stateObj.attributes.has_time) {
        date = new Date(
          stateObj.attributes.year,
          stateObj.attributes.month - 1,
          stateObj.attributes.day,
          stateObj.attributes.hour,
          stateObj.attributes.minute
        );
        return formatDateTime(date, locale);
      }
      if (stateObj.attributes.has_date) {
        date = new Date(
          stateObj.attributes.year,
          stateObj.attributes.month - 1,
          stateObj.attributes.day
        );
        return formatDate(date, locale);
      }
      if (stateObj.attributes.has_time) {
        date = new Date();
        date.setHours(stateObj.attributes.hour, stateObj.attributes.minute);
        return formatTime(date, locale);
      }
      return stateObj.state;
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

  // state of button is a timestamp
  if (
    domain === "button" ||
    domain === "input_button" ||
    domain === "scene" ||
    (domain === "sensor" && stateObj.attributes.device_class === "timestamp")
  ) {
    try {
      return formatDateTime(new Date(compareState), locale);
    } catch (_err) {
      return compareState;
    }
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
