import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { FrontendLocaleData } from "../../data/translation";
import {
  updateIsInstallingFromAttributes,
  UPDATE_SUPPORT_PROGRESS,
} from "../../data/update";
import { formatDuration, UNIT_TO_SECOND_CONVERT } from "../datetime/duration";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import { formatNumber, isNumericFromAttributes } from "../number/format_number";
import { blankBeforePercent } from "../translations/blank_before_percent";
import { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";
import { supportsFeatureFromAttributes } from "./supports-feature";

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  state?: string
): string =>
  computeStateDisplayFromEntityAttributes(
    localize,
    locale,
    stateObj.entity_id,
    stateObj.attributes,
    state !== undefined ? state : stateObj.state
  );

export const computeStateDisplayFromEntityAttributes = (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityId: string,
  attributes: any,
  state: string
): string => {
  if (state === UNKNOWN || state === UNAVAILABLE) {
    return localize(`state.default.${state}`);
  }

  // Entities with a `unit_of_measurement` or `state_class` are numeric values and should use `formatNumber`
  if (isNumericFromAttributes(attributes)) {
    // state is duration
    if (
      attributes.device_class === "duration" &&
      attributes.unit_of_measurement &&
      UNIT_TO_SECOND_CONVERT[attributes.unit_of_measurement]
    ) {
      try {
        return formatDuration(state, attributes.unit_of_measurement);
      } catch (_err) {
        // fallback to default
      }
    }
    if (attributes.device_class === "monetary") {
      try {
        return formatNumber(state, locale, {
          style: "currency",
          currency: attributes.unit_of_measurement,
          minimumFractionDigits: 2,
        });
      } catch (_err) {
        // fallback to default
      }
    }
    const unit = !attributes.unit_of_measurement
      ? ""
      : attributes.unit_of_measurement === "%"
      ? blankBeforePercent(locale) + "%"
      : ` ${attributes.unit_of_measurement}`;
    return `${formatNumber(state, locale)}${unit}`;
  }

  const domain = computeDomain(entityId);

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
      if (attributes.has_date && attributes.has_time) {
        date = new Date(
          attributes.year,
          attributes.month - 1,
          attributes.day,
          attributes.hour,
          attributes.minute
        );
        return formatDateTime(date, locale);
      }
      if (attributes.has_date) {
        date = new Date(attributes.year, attributes.month - 1, attributes.day);
        return formatDate(date, locale);
      }
      if (attributes.has_time) {
        date = new Date();
        date.setHours(attributes.hour, attributes.minute);
        return formatTime(date, locale);
      }
      return state;
    }
  }

  if (domain === "humidifier") {
    if (state === "on" && attributes.humidity) {
      return `${attributes.humidity} %`;
    }
  }

  // `counter` `number` and `input_number` domains do not have a unit of measurement but should still use `formatNumber`
  if (
    domain === "counter" ||
    domain === "number" ||
    domain === "input_number"
  ) {
    return formatNumber(state, locale);
  }

  // state of button is a timestamp
  if (
    domain === "button" ||
    domain === "input_button" ||
    domain === "scene" ||
    (domain === "sensor" && attributes.device_class === "timestamp")
  ) {
    try {
      return formatDateTime(new Date(state), locale);
    } catch (_err) {
      return state;
    }
  }

  if (domain === "update") {
    // When updating, and entity does not support % show "Installing"
    // When updating, and entity does support % show "Installing (xx%)"
    // When update available, show the version
    // When the latest version is skipped, show the latest version
    // When update is not available, show "Up-to-date"
    // When update is not available and there is no latest_version show "Unavailable"
    return state === "on"
      ? updateIsInstallingFromAttributes(attributes)
        ? supportsFeatureFromAttributes(attributes, UPDATE_SUPPORT_PROGRESS)
          ? localize("ui.card.update.installing_with_progress", {
              progress: attributes.in_progress,
            })
          : localize("ui.card.update.installing")
        : attributes.latest_version
      : attributes.skipped_version === attributes.latest_version
      ? attributes.latest_version ?? localize("state.default.unavailable")
      : localize("ui.card.update.up_to_date");
  }

  return (
    // Return device class translation
    (attributes.device_class &&
      localize(
        `component.${domain}.state.${attributes.device_class}.${state}`
      )) ||
    // Return default translation
    localize(`component.${domain}.state._.${state}`) ||
    // We don't know! Return the raw state.
    state
  );
};
