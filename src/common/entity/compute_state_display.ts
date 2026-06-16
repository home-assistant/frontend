import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import type { FrontendLocaleData } from "../../data/translation";
import { TimeZone } from "../../data/translation";
import type { HomeAssistant, ValuePart } from "../../types";
import { formatDate } from "../datetime/format_date";
import { formatDateTime } from "../datetime/format_date_time";
import { DURATION_UNITS, formatDuration } from "../datetime/format_duration";
import { formatTime } from "../datetime/format_time";
import {
  formatNumber,
  formatNumberToParts,
  getNumberFormatOptions,
  isNumericFromAttributes,
} from "../number/format_number";
import { blankBeforeUnit } from "../translations/blank_before_unit";
import type { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";
import {
  isNumericSensorDeviceClass,
  SENSOR_TIMESTAMP_DEVICE_CLASSES,
} from "../../data/sensor";

// Domains whose state is a timezone-agnostic date and/or time string.
const DATE_TIME_DOMAINS = new Set(["date", "input_datetime", "time"]);

// Domains whose state is a timestamp.
const TIMESTAMP_DOMAINS = new Set([
  "ai_task",
  "button",
  "conversation",
  "event",
  "image",
  "infrared",
  "input_button",
  "notify",
  "radio_frequency",
  "scene",
  "stt",
  "tag",
  "tts",
  "wake_word",
  "datetime",
]);

// Maps Intl.NumberFormat part types to ValuePart types for monetary states.
const MONETARY_TYPE_MAP: Record<string, ValuePart["type"]> = {
  integer: "value",
  group: "value",
  decimal: "value",
  fraction: "value",
  minusSign: "currency_sign",
  plusSign: "currency_sign",
  literal: "literal",
  currency: "unit",
};

const NUMERICAL_DOMAINS = ["counter", "input_number", "number"];

export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
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
  config: HassConfig,
  entity: EntityRegistryDisplayEntry | undefined,
  entityId: string,
  attributes: any,
  state: string
): string => {
  const parts = computeStateToPartsFromEntityAttributes(
    localize,
    locale,
    config,
    entity,
    entityId,
    attributes,
    state
  );
  return parts.map((part) => part.value).join("");
};

const computeStateToPartsFromEntityAttributes = (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig,
  entity: EntityRegistryDisplayEntry | undefined,
  entityId: string,
  attributes: any,
  state: string
): ValuePart[] => {
  if (state === UNKNOWN || state === UNAVAILABLE) {
    return [
      {
        type: "value",
        value: localize(`state.default.${state}`),
      },
    ];
  }

  const domain = computeDomain(entityId);
  const isNumberDomain = NUMERICAL_DOMAINS.includes(domain);
  const isSensorDomain = domain === "sensor";

  // Numeric values (by attributes, number domain,
  // or numeric sensor device class) use formatNumber.
  if (
    isNumericFromAttributes(attributes) ||
    isNumberDomain ||
    (isSensorDomain && isNumericSensorDeviceClass(attributes.device_class))
  ) {
    // state is duration
    if (
      attributes.device_class === "duration" &&
      attributes.unit_of_measurement &&
      DURATION_UNITS.includes(attributes.unit_of_measurement)
    ) {
      try {
        return [
          {
            type: "value",
            value: formatDuration(
              locale,
              state,
              attributes.unit_of_measurement,
              entity?.display_precision
            ),
          },
        ];
      } catch (_err) {
        // fallback to default
      }
    }

    // state is monetary
    if (attributes.device_class === "monetary") {
      let parts: Record<string, string>[] = [];
      try {
        parts = formatNumberToParts(state, locale, {
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
        // fallback to default numeric formatting below
      }

      if (parts.length) {
        const valueParts: ValuePart[] = [];

        for (const part of parts) {
          const type = MONETARY_TYPE_MAP[part.type];
          if (!type) continue;
          const last = valueParts[valueParts.length - 1];
          // Merge consecutive value parts (e.g. "-" + "12" + "." + "00" → "-12.00")
          if (type === "value" && last?.type === "value") {
            last.value += part.value;
          } else {
            valueParts.push({ type, value: part.value });
          }
        }
        return valueParts;
      }
    }

    // default processing of numeric values
    const value = formatNumber(
      state,
      locale,
      getNumberFormatOptions({ state, attributes } as HassEntity, entity)
    );

    const unit =
      (entity?.translation_key &&
        localize(
          `component.${entity.platform}.entity.${domain}.${entity.translation_key}.unit_of_measurement`
        )) ||
      attributes.unit_of_measurement;

    if (unit) {
      return [
        { type: "value", value: value },
        { type: "literal", value: blankBeforeUnit(unit, locale) },
        { type: "unit", value: unit },
      ];
    }

    return [{ type: "value", value: value }];
  }

  if (DATE_TIME_DOMAINS.has(domain)) {
    // If trying to display an explicit state, need to parse the explicit state to `Date` then format.
    // Attributes aren't available, we have to use `state`.

    // These are timezone agnostic, so we should NOT use the system timezone here.
    try {
      const components = state.split(" ");
      if (components.length === 2) {
        // Date and time.
        return [
          {
            type: "value",
            value: formatDateTime(
              new Date(components.join("T")),
              { ...locale, time_zone: TimeZone.local },
              config
            ),
          },
        ];
      }
      if (components.length === 1) {
        if (state.includes("-")) {
          // Date only.
          return [
            {
              type: "value",
              value: formatDate(
                new Date(`${state}T00:00`),
                { ...locale, time_zone: TimeZone.local },
                config
              ),
            },
          ];
        }
        if (state.includes(":")) {
          // Time only.
          const now = new Date();
          return [
            {
              type: "value",
              value: formatTime(
                new Date(`${now.toISOString().split("T")[0]}T${state}`),
                { ...locale, time_zone: TimeZone.local },
                config
              ),
            },
          ];
        }
      }
      return [{ type: "value", value: state }];
    } catch (_e) {
      // Formatting methods may throw error if date parsing doesn't go well,
      // just return the state string in that case.
      return [{ type: "value", value: state }];
    }
  }

  // state is a timestamp
  if (
    TIMESTAMP_DOMAINS.has(domain) ||
    (domain === "sensor" &&
      SENSOR_TIMESTAMP_DEVICE_CLASSES.includes(attributes.device_class))
  ) {
    try {
      return [
        {
          type: "value",
          value: formatDateTime(new Date(state), locale, config),
        },
      ];
    } catch (_err) {
      return [{ type: "value", value: state }];
    }
  }

  return [
    {
      type: "value",
      value:
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
        state,
    },
  ];
};

export const computeStateToParts = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  state?: string
): ValuePart[] => {
  const entity = entities?.[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  return computeStateToPartsFromEntityAttributes(
    localize,
    locale,
    config,
    entity,
    stateObj.entity_id,
    stateObj.attributes,
    state !== undefined ? state : stateObj.state
  );
};
