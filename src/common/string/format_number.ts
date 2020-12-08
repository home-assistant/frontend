import { NumberFormat } from "../../data/frontend";

export interface FormatNumberParams {
  /**
   * The user-selected language, usually from hass.language
   */
  language?: string;
  /**
   * The user-selected number format, usually from hass.userData.numberFormat
   */
  format?: NumberFormat;
  /**
   * Intl.NumberFormatOptions to use when formatting the number
   */
  options?: Intl.NumberFormatOptions;
}

/**
 * Formats a number based on the specified language with thousands separator(s) and decimal character for better legibility.
 *
 * @param num The number to format
 * @param params Specify the user-selected language, user-selected number format, and Intl.NumberFormatOptions to use
 */
export const formatNumber = (
  num: string | number,
  params: FormatNumberParams
): string => {
  let format: string | string[] | undefined;

  switch (params.format) {
    case NumberFormat.comma_decimal:
      format = ["en-US", "en"]; // Use United States with fallback to English formatting 1,234,567.89
      break;
    case NumberFormat.decimal_comma:
      format = ["de", "es", "it"]; // Use German with fallback to Spanish then Italian formatting 1.234.567,89
      break;
    case NumberFormat.space_comma:
      format = ["fr", "sv", "cs"]; // Use French with fallback to Swedish and Czech formatting 1 234 567,89
      break;
    case NumberFormat.system:
      format = undefined;
      break;
    default:
      format = params.language;
  }

  // Polyfill for Number.isNaN, which is more reliable than the global isNaN()
  Number.isNaN =
    Number.isNaN ||
    function isNaN(input) {
      return typeof input === "number" && isNaN(input);
    };

  if (
    !Number.isNaN(Number(num)) &&
    Intl &&
    params.format !== NumberFormat.none
  ) {
    return new Intl.NumberFormat(
      format,
      getDefaultFormatOptions(num, params.options)
    ).format(Number(num));
  }
  return num.toString();
};

/**
 * Generates default options for Intl.NumberFormat
 * @param num The number to be formatted
 * @param options The Intl.NumberFormatOptions that should be included in the returned options
 */
const getDefaultFormatOptions = (
  num: string | number,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormatOptions => {
  const defaultOptions: Intl.NumberFormatOptions = options || {};

  if (typeof num !== "string") {
    return defaultOptions;
  }

  // Keep decimal trailing zeros if they are present in a string numeric value
  if (
    !options ||
    (!options.minimumFractionDigits && !options.maximumFractionDigits)
  ) {
    const digits = num.indexOf(".") > -1 ? num.split(".")[1].length : 0;
    defaultOptions.minimumFractionDigits = digits;
    defaultOptions.maximumFractionDigits = digits;
  }

  return defaultOptions;
};
