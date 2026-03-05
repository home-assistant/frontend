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
  const parts = computeStateToPartsFromEntityAttributes(
    localize,
    locale,
    sensorNumericDeviceClasses,
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
  sensorNumericDeviceClasses: string[],
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
  const is_number_domain =
    domain === "counter" || domain === "number" || domain === "input_number";
  // Entities with a `unit_of_measurement` or `state_class` are numeric values and should use `formatNumber`
  if (
    isNumericFromAttributes(
      attributes,
      domain === "sensor" ? sensorNumericDeviceClasses : []
    ) ||
    is_number_domain
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
        // fallback to default
      }

      const TYPE_MAP: Record<string, ValuePart["type"]> = {
        integer: "value",
        group: "value",
        decimal: "value",
        fraction: "value",
        literal: "literal",
        currency: "unit",
      };

      const valueParts: ValuePart[] = [];

      for (const part of parts) {
        const type = TYPE_MAP[part.type];
        if (!type) continue;
        const last = valueParts[valueParts.length - 1];
        // Merge consecutive numeric parts (e.g. "1" + "," + "234" + "." + "56" → "1,234.56")
        if (type === "value" && last?.type === "value") {
          last.value += part.value;
        } else {
          valueParts.push({ type, value: part.value });
        }
      }

      return valueParts;
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

  if (["date", "input_datetime", "time"].includes(domain)) {
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
    [
      "ai_task",
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
      "datetime",
    ].includes(domain) ||
    (domain === "sensor" && attributes.device_class === "timestamp")
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
  sensorNumericDeviceClasses: string[],
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
    sensorNumericDeviceClasses,
    config,
    entity,
    stateObj.entity_id,
    stateObj.attributes,
    state !== undefined ? state : stateObj.state
  );
};
