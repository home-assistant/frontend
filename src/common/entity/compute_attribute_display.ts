import { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { FrontendLocaleData } from "../../data/translation";
import { HomeAssistant } from "../../types";
import checkValidDate from "../datetime/check_valid_date";
import { formatDate } from "../datetime/format_date";
import { formatDateTimeWithSeconds } from "../datetime/format_date_time";
import { formatNumber } from "../number/format_number";
import { capitalizeFirstLetter } from "../string/capitalize-first-letter";
import { isDate } from "../string/is_date";
import { isTimestamp } from "../string/is_timestamp";
import { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";

export const computeAttributeValueDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): string => {
  const attributeValue =
    value !== undefined ? value : stateObj.attributes[attribute];

  // Null value, the state is unknown
  if (attributeValue === null) {
    return localize("state.default.unknown");
  }

  // Number value, return formatted number
  if (typeof attributeValue === "number") {
    return formatNumber(attributeValue, locale);
  }

  // Special handling in case this is a string with an known format
  if (typeof attributeValue === "string") {
    // Date handling
    if (isDate(attributeValue, true)) {
      // Timestamp handling
      if (isTimestamp(attributeValue)) {
        const date = new Date(attributeValue);
        if (checkValidDate(date)) {
          return formatDateTimeWithSeconds(date, locale, config);
        }
      }

      // Value was not a timestamp, so only do date formatting
      const date = new Date(attributeValue);
      if (checkValidDate(date)) {
        return formatDate(date, locale, config);
      }
    }
  }

  // Values are objects, render object
  if (
    (Array.isArray(attributeValue) &&
      attributeValue.some((val) => val instanceof Object)) ||
    (!Array.isArray(attributeValue) && attributeValue instanceof Object)
  ) {
    return JSON.stringify(attributeValue);
  }
  // If this is an array, try to determine the display value for each item
  if (Array.isArray(attributeValue)) {
    return attributeValue
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

  // We've explored all known value handling, so now we'll try to find a
  // translation for the value.
  const entityId = stateObj.entity_id;
  const domain = computeDomain(entityId);
  const deviceClass = stateObj.attributes.device_class;
  const registryEntry = entities[entityId] as
    | EntityRegistryDisplayEntry
    | undefined;
  const translationKey = registryEntry?.translation_key;

  return (
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
    attributeValue
  );
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
