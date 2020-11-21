/**
 * Formats a number based on the specified language with thousands separator(s) and decimal character for better legibility.
 *
 * @param num The number to format
 * @param language The language to use when formatting the number
 */
export const formatNumber = (
  num: string | number,
  language: string,
  options?: Intl.NumberFormatOptions
): string => {
  // Polyfill for Number.isNaN, which is more reliable than the global isNaN()
  Number.isNaN =
    Number.isNaN ||
    function isNaN(input) {
      return typeof input === "number" && isNaN(input);
    };

  if (!Number.isNaN(Number(num)) && Intl) {
    return new Intl.NumberFormat(
      language,
      getDefaultFormatOptions(num, options)
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
  let defaultOptions: Intl.NumberFormatOptions = options || {};

  // Keep decimal trailing zeros if they are present
  if (
    !options ||
    (!options.minimumFractionDigits && !options.maximumFractionDigits)
  ) {
    const digits =
      num.toString().indexOf(".") > -1
        ? num.toString().split(".")[1].length
        : 0;
    defaultOptions.minimumFractionDigits = digits;
    defaultOptions.maximumFractionDigits = digits;
  }

  return defaultOptions;
};
