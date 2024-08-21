import { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { FrontendLocaleData, TimeZone } from "../../data/translation";
import { HomeAssistant } from "../../types";
import {
  UNIT_TO_MILLISECOND_CONVERT,
  formatDuration,
} from "../datetime/duration";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { formatTime } from "../datetime/format_time";
import {
  formatNumber,
  getNumberFormatOptions,
  isNumericFromAttributes,
} from "../number/format_number";
import { blankBeforeUnit } from "../translations/blank_before_unit";
import { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  sensorNumericDeviceClasses: string[],
  config: HassConfig,
  entities: HomeAssistant["entities"],
  state?: string
): string => {
  const entity = entities?.[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  return computeStateDisplayFromEntityAttributes(
    localize,
    locale,
    sensorNumericDeviceClasses,
    config,
    entity,
    stateObj.entity_id,
    stateObj.attributes,
    state !== undefined ? state : stateObj.state
  );
};

export const computeStateDisplayFromEntityAttributes = (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  sensorNumericDeviceClasses: string[],
  config: HassConfig,
  entity: EntityRegistryDisplayEntry | undefined,
  entityId: string,
  attributes: any,
  state: string
): string => {
  if (state === UNKNOWN || state === UNAVAILABLE) {
    return localize(`state.default.${state}`);
  }

  const domain = computeDomain(entityId);

  // Entities with a `unit_of_measurement` or `state_class` are numeric values and should use `formatNumber`
  if (
    isNumericFromAttributes(
      attributes,
      domain === "sensor" ? sensorNumericDeviceClasses : []
    )
  ) {
    // state is duration
    if (
      attributes.device_class === "duration" &&
      attributes.unit_of_measurement &&
      UNIT_TO_MILLISECOND_CONVERT[attributes.unit_of_measurement]
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
          // Override monetary options with number format
          ...getNumberFormatOptions(
            { state, attributes } as HassEntity,
            entity
          ),
        });
      } catch (_err) {
        // fallback to default
      }
    }

    const value = formatNumber(
      state,
      locale,
      getNumberFormatOptions({ state, attributes } as HassEntity, entity)
    );

    const unit = attributes.unit_of_measurement;

    if (unit) {
      return `${value}${blankBeforeUnit(unit, locale)}${unit}`;
    }

    return value;
  }

  if (domain === "datetime") {
    const time = new Date(state);
    return formatDateTime(time, locale, config);
  }

  if (["date", "input_datetime", "time"].includes(domain)) {
    // If trying to display an explicit state, need to parse the explicit state to `Date` then format.
    // Attributes aren't available, we have to use `state`.

    // These are timezone agnostic, so we should NOT use the system timezone here.
    try {
      const components = state.split(" ");
      if (components.length === 2) {
        // Date and time.
        return formatDateTime(
          new Date(components.join("T")),
          { ...locale, time_zone: TimeZone.local },
          config
        );
      }
      if (components.length === 1) {
        if (state.includes("-")) {
          // Date only.
          return formatDate(
            new Date(`${state}T00:00`),
            { ...locale, time_zone: TimeZone.local },
            config
          );
        }
        if (state.includes(":")) {
          // Time only.
          const now = new Date();
          return formatTime(
            new Date(`${now.toISOString().split("T")[0]}T${state}`),
            { ...locale, time_zone: TimeZone.local },
            config
          );
        }
      }
      return state;
    } catch (_e) {
      // Formatting methods may throw error if date parsing doesn't go well,
      // just return the state string in that case.
      return state;
    }
  }

  // `counter` `number` and `input_number` domains do not have a unit of measurement but should still use `formatNumber`
  if (
    domain === "counter" ||
    domain === "number" ||
    domain === "input_number"
  ) {
    // Format as an integer if the value and step are integers
    return formatNumber(
      state,
      locale,
      getNumberFormatOptions({ state, attributes } as HassEntity, entity)
    );
  }

  // state is a timestamp
  if (
    [
      "button",
      "conversation",
      "event",
      "image",
      "input_button",
      "notify",
      "scene",
      "stt",
      "tag",
      "tts",
      "wake_word",
    ].includes(domain) ||
    (domain === "sensor" && attributes.device_class === "timestamp")
  ) {
    try {
      return formatDateTime(new Date(state), locale, config);
    } catch (_err) {
      return state;
    }
  }

  return (
    (entity?.translation_key &&
      localize(
        `component.${entity.platform}.entity.${domain}.${entity.translation_key}.state.${state}`
      )) ||
    // Return device class translation
    (attributes.device_class &&
      localize(
        `component.${domain}.entity_component.${attributes.device_class}.state.${state}`
      )) ||
    // Return default translation
    localize(`component.${domain}.entity_component._.state.${state}`) ||
    // We don't know! Return the raw state.
    state
  );
};
