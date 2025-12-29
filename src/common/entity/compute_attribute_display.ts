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
  const formattedValue = computeAttributeValuePartDisplay(
    "value",
    localize,
    stateObj,
    locale,
    config,
    entities,
    attribute,
    value
  );
  const unit = computeAttributeValuePartDisplay(
    "unit",
    localize,
    stateObj,
    locale,
    config,
    entities,
    attribute,
    value
  );
  const literal = computeAttributeValuePartDisplay(
    "literal",
    localize,
    stateObj,
    locale,
    config,
    entities,
    attribute,
    value
  );
  return `${formattedValue ?? ""}${literal ?? ""}${unit ?? ""}`;
};

export const computeAttributeValueToPartsDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): ValuePart[] | undefined => {
  const parts: ValuePart[] = [];
  const domain = computeStateDomain(stateObj);

  let formattedValue;
  const attributeValue =
    value !== undefined
      ? value
      : attribute in stateObj.attributes
        ? stateObj.attributes[attribute]
        : undefined;

  if (attributeValue === null || attributeValue === undefined)
    formattedValue = localize("state.default.unknown");
  else {
    if (typeof attributeValue === "number") {
      const formatter = DOMAIN_ATTRIBUTES_FORMATERS[domain]?.[attribute];
      formattedValue = formatter
        ? formatter(attributeValue, locale)
        : formatNumber(attributeValue, locale);
    } else if (typeof attributeValue === "string") {
      // Date handling
      if (isDate(attributeValue, true)) {
        // Timestamp handling
        if (isTimestamp(attributeValue)) {
          const date = new Date(attributeValue);
          if (checkValidDate(date))
            formattedValue = formatDateTimeWithSeconds(date, locale, config);
        } else {
          // Value was not a timestamp, so only do date formatting
          const date = new Date(attributeValue);
          if (checkValidDate(date))
            formattedValue = formatDate(date, locale, config);
        }
      }
    } else if (
      // Values are objects, render object
      (Array.isArray(attributeValue) &&
        attributeValue.some((val) => val instanceof Object)) ||
      (!Array.isArray(attributeValue) && attributeValue instanceof Object)
    ) {
      formattedValue = JSON.stringify(attributeValue);
    } else if (Array.isArray(attributeValue)) {
      // If this is an array, try to determine the display value for each item
      formattedValue = attributeValue
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
    }

    if (formattedValue === undefined) {
      // We've explored all known value handling, so now we'll try to find a
      // translation for the value.
      const entityId = stateObj.entity_id;
      const deviceClass = stateObj.attributes.device_class;
      const registryEntry = entities[entityId] as
        | EntityRegistryDisplayEntry
        | undefined;
      const translationKey = registryEntry?.translation_key;

      formattedValue =
        (translationKey &&
          localize(
            `component.${registryEntry.platform}.entity.${domain}
          .${translationKey}
          .state_attributes.${attribute}.state.${attributeValue}`
          )) ||
        (deviceClass &&
          localize(
            `component.${domain}.entity_component.${deviceClass}
          .state_attributes.${attribute}.state.${attributeValue}`
          )) ||
        localize(
          `component.${domain}.entity_component._
        .state_attributes.${attribute}.state.${attributeValue}`
        ) ||
        attributeValue;
    }
  }

  let unit;
  if (typeof attributeValue === "number") {
    unit = DOMAIN_ATTRIBUTES_UNITS[domain]?.[attribute] as string | undefined;
    if (domain === "weather") {
      unit = getWeatherUnit(config, stateObj as WeatherEntity, attribute);
    } else if (TEMPERATURE_ATTRIBUTES.has(attribute)) {
      unit = config.unit_system.temperature;
    }
  }

  let literal;
  if (unit) literal = blankBeforeUnit(unit, locale);

  parts.push({ type: "value", value: formattedValue });
  if (literal) parts.push({ type: "literal", value: literal });
  if (unit) parts.push({ type: "unit", value: unit });
  return parts;
};

export const computeAttributeValuePartDisplay = (
  type: string,
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): string | undefined => {
  let partValue;
  const parts = computeAttributeValueToPartsDisplay(
    localize,
    stateObj,
    locale,
    config,
    entities,
    attribute,
    value
  );
  const foundPart = parts?.find((_part) => _part.type === type);
  if (foundPart) partValue = foundPart.value;
  return partValue;
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
