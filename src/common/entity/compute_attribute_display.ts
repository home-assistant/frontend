import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import {
  DOMAIN_ATTRIBUTES_FORMATERS,
  DOMAIN_ATTRIBUTES_UNITS,
  TEMPERATURE_ATTRIBUTES,
} from "../../data/entity/entity_attributes";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import type { FrontendLocaleData } from "../../data/translation";
import type { WeatherEntity } from "../../data/weather";
import { getWeatherUnit } from "../../data/weather";
import type { HomeAssistant, ValuePart } from "../../types";
import checkValidDate from "../datetime/check_valid_date";
import { formatDate } from "../datetime/format_date";
import { formatDateTimeWithSeconds } from "../datetime/format_date_time";
import { formatNumber } from "../number/format_number";
import { capitalizeFirstLetter } from "../string/capitalize-first-letter";
import { isDate } from "../string/is_date";
import { isTimestamp } from "../string/is_timestamp";
import { blankBeforeUnit } from "../translations/blank_before_unit";
import type { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";
import { computeStateDomain } from "./compute_state_domain";

export const computeAttributeValueDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): string => {
  // Number value, return formatted number
  const parts = computeAttributeValueToParts(
    localize,
    stateObj,
    locale,
    config,
    entities,
    attribute,
    value
  );
  return parts.map((p) => p.value).join("");
};

export const computeAttributeValueToParts = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): ValuePart[] => {
  const attributeValue =
    value !== undefined ? value : stateObj.attributes[attribute];

  // Null value, the state is unknown
  if (attributeValue === null || attributeValue === undefined) {
    return [{ type: "value", value: localize("state.default.unknown") }];
  }

  // Number value, return formatted number
  if (typeof attributeValue === "number") {
    const domain = computeStateDomain(stateObj);

    const formatter = DOMAIN_ATTRIBUTES_FORMATERS[domain]?.[attribute];

    const formattedValue = formatter
      ? formatter(attributeValue, locale)
      : formatNumber(attributeValue, locale);

    let unit = DOMAIN_ATTRIBUTES_UNITS[domain]?.[attribute] as
      | string
      | undefined;

    if (domain === "weather") {
      unit = getWeatherUnit(config, stateObj as WeatherEntity, attribute);
    } else if (TEMPERATURE_ATTRIBUTES.has(attribute)) {
      unit = config.unit_system.temperature;
    }

    const parts: ValuePart[] = [{ type: "value", value: formattedValue }];

    if (unit) {
      const literal = blankBeforeUnit(unit, locale);
      if (literal) {
        parts.push({ type: "literal", value: literal });
      }
      parts.push({ type: "unit", value: unit });
    }
    return parts;
  }

  // Special handling in case this is a string with a known format
  if (typeof attributeValue === "string") {
    // Date handling
    if (isDate(attributeValue, true)) {
      // Timestamp handling
      if (isTimestamp(attributeValue)) {
        const date = new Date(attributeValue);
        if (checkValidDate(date)) {
          const formattedDate = formatDateTimeWithSeconds(date, locale, config);
          return [{ type: "value", value: formattedDate }];
        }
      }

      // Value was not a timestamp, so only do date formatting
      const date = new Date(attributeValue);
      if (checkValidDate(date)) {
        return [{ type: "value", value: formatDate(date, locale, config) }];
      }
    }
  }

  // Values are objects, render object
  if (
    (Array.isArray(attributeValue) &&
      attributeValue.some((val) => val instanceof Object)) ||
    (!Array.isArray(attributeValue) && attributeValue instanceof Object)
  ) {
    return [{ type: "value", value: JSON.stringify(attributeValue) }];
  }
  // If this is an array, try to determine the display value for each item
  if (Array.isArray(attributeValue)) {
    const formattedValue = attributeValue
      .map((item) =>
        computeAttributeValueDisplay(
          localize,
          stateObj,
          locale,
          config,
          entities,
          attribute,
          item
        )
      )
      .join(", ");
    return [{ type: "value", value: formattedValue }];
  }

  // We've explored all known value handling, so now we'll try to find a
  // translation for the value.
  const entityId = stateObj.entity_id;
  const domain = computeDomain(entityId);
  const deviceClass = stateObj.attributes.device_class;
  const registryEntry = entities[entityId] as
    | EntityRegistryDisplayEntry
    | undefined;
  const translationKey = registryEntry?.translation_key;

  const formattedValue =
    (translationKey &&
      localize(
        `component.${registryEntry.platform}.entity.${domain}.${translationKey}.state_attributes.${attribute}.state.${attributeValue}`
      )) ||
    (deviceClass &&
      localize(
        `component.${domain}.entity_component.${deviceClass}.state_attributes.${attribute}.state.${attributeValue}`
      )) ||
    localize(
      `component.${domain}.entity_component._.state_attributes.${attribute}.state.${attributeValue}`
    ) ||
    attributeValue;
  return [{ type: "value", value: formattedValue }];
};

export const computeAttributeNameDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  attribute: string
): string => {
  const entityId = stateObj.entity_id;
  const deviceClass = stateObj.attributes.device_class;
  const domain = computeDomain(entityId);
  const entity = entities[entityId] as EntityRegistryDisplayEntry | undefined;
  const translationKey = entity?.translation_key;

  return (
    (translationKey &&
      localize(
        `component.${entity.platform}.entity.${domain}.${translationKey}.state_attributes.${attribute}.name`
      )) ||
    (deviceClass &&
      localize(
        `component.${domain}.entity_component.${deviceClass}.state_attributes.${attribute}.name`
      )) ||
    localize(
      `component.${domain}.entity_component._.state_attributes.${attribute}.name`
    ) ||
    capitalizeFirstLetter(
      attribute
        .replace(/_/g, " ")
        .replace(/\bid\b/g, "ID")
        .replace(/\bip\b/g, "IP")
        .replace(/\bmac\b/g, "MAC")
        .replace(/\bgps\b/g, "GPS")
    )
  );
};
