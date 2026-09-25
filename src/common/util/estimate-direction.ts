// Character ranges for Hebrew and Arabic
const rtlRange = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
// Character ranges for ASCII and Latin characters, explicit LTR marks, etc.
const ltrRange =
  "A-Za-z\u00C0-\u00D6\u00D8-\u00F6" +
  "\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C" +
  "\uFE00-\uFE6F\uFEFD-\uFFFF";

/* eslint-disable no-misleading-character-class */
const rtl = new RegExp(`^[^${ltrRange}]*[${rtlRange}]`);
const ltr = new RegExp(`^[^${rtlRange}]*[${ltrRange}]`);
/* eslint-enable no-misleading-character-class */

/**
 * Detect the direction of text: left-to-right, right-to-left, or neutral
 *
 * @param {string} value
 * @returns {'rtl'|'ltr'|'neutral'}
 */
export function estimateDirection(value: string) {
  const source = String(value || "");
  return rtl.test(source) ? "rtl" : ltr.test(source) ? "ltr" : "neutral";
}
