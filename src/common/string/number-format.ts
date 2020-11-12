/**
 * Formats a number based on the specified language with thousands separator(s) and decimal character for better legibility.
 *
 * @param num The number to format
 * @param language The language to use when formatting the number
 */
export const numberFormat = (
  num: string | number,
  language: string
): string => {
  // Polyfill for Number.isNaN, which is more reliable that the global isNaN()
  Number.isNaN =
    Number.isNaN ||
    function isNaN(input) {
      return typeof input === "number" && isNaN(input);
    };

  if (!Number.isNaN(Number(num)) && Intl) {
    return new Intl.NumberFormat(language).format(Number(num));
  }
  return num.toString();
};
