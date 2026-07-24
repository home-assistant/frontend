const SEPARATORS = "\\s\\-_.";
const LEADING_SEPARATORS = new RegExp(`^[${SEPARATORS}]+`);
const TRAILING_SEPARATORS = new RegExp(`[${SEPARATORS}]+$`);
const STARTS_WITH_SEPARATOR = new RegExp(`^[${SEPARATORS}]`);
const ENDS_WITH_SEPARATOR = new RegExp(`[${SEPARATORS}]$`);

/**
 * Strips `label` from the start or end of `text` on a word boundary,
 * case-insensitively, and trims the surrounding separators.
 *
 * Returns:
 * - `""` when `text` equals `label`,
 * - the trimmed remainder for a prefix or suffix match,
 * - `null` when `label` is not a word-boundary prefix or suffix of `text`.
 */
export const stripBoundaryLabel = (
  text: string,
  label: string
): string | null => {
  const lowerText = text.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (lowerText === lowerLabel) {
    return "";
  }

  if (lowerText.startsWith(lowerLabel)) {
    const rest = text.slice(label.length);
    if (STARTS_WITH_SEPARATOR.test(rest)) {
      return rest.replace(LEADING_SEPARATORS, "").trim();
    }
  }

  if (lowerText.endsWith(lowerLabel)) {
    const rest = text.slice(0, text.length - label.length);
    if (ENDS_WITH_SEPARATOR.test(rest)) {
      return rest.replace(TRAILING_SEPARATORS, "").trim();
    }
  }

  return null;
};
