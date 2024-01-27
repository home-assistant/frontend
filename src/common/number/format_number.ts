import {
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { FrontendLocaleData, NumberFormat } from "../../data/translation";
import { round } from "./round";

/**
 * Returns true if the entity is considered numeric based on the attributes it has
 * @param stateObj The entity state object
 */
export const isNumericState = (stateObj: HassEntity): boolean =>
  isNumericFromAttributes(stateObj.attributes);

export const isNumericFromAttributes = (
  attributes: HassEntityAttributeBase
): boolean => !!attributes.unit_of_measurement || !!attributes.state_class;

export const numberFormatToLocale = (
  localeOptions: FrontendLocaleData
): string | string[] | undefined => {
  switch (localeOptions.number_format) {
    case NumberFormat.comma_decimal:
      return ["en-US", "en"]; // Use United States with fallback to English formatting 1,234,567.89
    case NumberFormat.decimal_comma:
      return ["de", "es", "it"]; // Use German with fallback to Spanish then Italian formatting 1.234.567,89
    case NumberFormat.space_comma:
      return ["fr", "sv", "cs"]; // Use French with fallback to Swedish and Czech formatting 1 234 567,89
    case NumberFormat.system:
      return undefined;
    default:
      return localeOptions.language;
  }
};

/**
 * Formats a number based on the user's preference with thousands separator(s) and decimal character for better legibility.
 *
 * @param num The number to format
 * @param localeOptions The user-selected language and formatting, from `hass.locale`
 * @param options Intl.NumberFormatOptions to use
 */
export const formatNumber = (
  num: string | number,
  localeOptions?: FrontendLocaleData,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = localeOptions
    ? numberFormatToLocale(localeOptions)
    : undefined;

  // Polyfill for Number.isNaN, which is more reliable than the global isNaN()
  Number.isNaN =
    Number.isNaN ||
    function isNaN(input) {
      return typeof input === "number" && isNaN(input);
    };

  if (
    localeOptions?.number_format !== NumberFormat.none &&
    !Number.isNaN(Number(num)) &&
    Intl
  ) {
    try {
      return new Intl.NumberFormat(
        locale,
        getDefaultFormatOptions(num, options)
      ).format(Number(num));
    } catch (err: any) {
      // Don't fail when using "TEST" language
      // eslint-disable-next-line no-console
      console.error(err);
      return new Intl.NumberFormat(
        undefined,
        getDefaultFormatOptions(num, options)
      ).format(Number(num));
    }
  }

  if (
    !Number.isNaN(Number(num)) &&
    num !== "" &&
    localeOptions?.number_format === NumberFormat.none &&
    Intl
  ) {
    // If NumberFormat is none, use en-US format without grouping.
    return new Intl.NumberFormat(
      "en-US",
      getDefaultFormatOptions(num, {
        ...options,
        useGrouping: false,
      })
    ).format(Number(num));
  }

  if (typeof num === "string") {
    return num;
  }
  return `${round(num, options?.maximumFractionDigits).toString()}${
    options?.style === "currency" ? ` ${options.currency}` : ""
  }`;
};

/**
 * Checks if the current entity state should be formatted as an integer based on the `state` and `step` attribute and returns the appropriate `Intl.NumberFormatOptions` object with `maximumFractionDigits` set
 * @param entityState The state object of the entity
 * @returns An `Intl.NumberFormatOptions` object with `maximumFractionDigits` set to 0, or `undefined`
 */
export const getNumberFormatOptions = (
  entityState?: HassEntity,
  entity?: EntityRegistryDisplayEntry
): Intl.NumberFormatOptions | undefined => {
  const precision = entity?.display_precision;
  if (precision != null) {
    return {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    };
  }
  if (
    Number.isInteger(Number(entityState?.attributes?.step)) &&
    Number.isInteger(Number(entityState?.state))
  ) {
    return { maximumFractionDigits: 0 };
  }
  return undefined;
};

/**
 * Generates default options for Intl.NumberFormat
 * @param num The number to be formatted
 * @param options The Intl.NumberFormatOptions that should be included in the returned options
 */
export const getDefaultFormatOptions = (
  num: string | number,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormatOptions => {
  const defaultOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    ...options,
  };

  if (typeof num !== "string") {
    return defaultOptions;
  }

  // Keep decimal trailing zeros if they are present in a string numeric value
  if (
    !options ||
    (options.minimumFractionDigits === undefined &&
      options.maximumFractionDigits === undefined)
  ) {
    const digits = num.indexOf(".") > -1 ? num.split(".")[1].length : 0;
    defaultOptions.minimumFractionDigits = digits;
    defaultOptions.maximumFractionDigits = digits;
  }

  return defaultOptions;
};
