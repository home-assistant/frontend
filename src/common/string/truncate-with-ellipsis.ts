/**
 * @summary Truncates a string to `maxLength`, appending `ellipsis` only when it actually shortens the result.
 * @param text The input string.
 * @param maxLength Maximum length of the prefix kept before the ellipsis.
 * @param ellipsis Suffix appended when truncation occurs.
 * @returns `text` unchanged when its length is `<= maxLength + ellipsis.length`, otherwise `text.substring(0, maxLength) + ellipsis`.
 */
export const truncateWithEllipsis = (
  text: string,
  maxLength: number,
  ellipsis = "..."
): string => {
  if (text.length <= maxLength + ellipsis.length) {
    return text;
  }
  return `${text.substring(0, maxLength)}${ellipsis}`;
};
