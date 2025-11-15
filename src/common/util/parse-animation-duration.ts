/**
 * Parses a CSS duration string (e.g., "300ms", "3s") and returns the duration in milliseconds.
 *
 * @param duration - A CSS duration string (e.g., "300ms", "3s", "0.5s")
 * @returns The duration in milliseconds, or 0 if the input is invalid
 *
 * @example
 * parseAnimationDuration("300ms") // Returns 300
 * parseAnimationDuration("3s")    // Returns 3000
 * parseAnimationDuration("0.5s")  // Returns 500
 * parseAnimationDuration("invalid") // Returns 0
 */
export const parseAnimationDuration = (duration: string): number => {
  const trimmed = duration.trim();

  let value: number;
  let multiplier: number;

  if (trimmed.endsWith("ms")) {
    value = parseFloat(trimmed.slice(0, -2));
    multiplier = 1;
  } else if (trimmed.endsWith("s")) {
    value = parseFloat(trimmed.slice(0, -1));
    multiplier = 1000;
  } else {
    // No recognized unit, try parsing as number (assume ms)
    value = parseFloat(trimmed);
    multiplier = 1;
  }

  if (!isFinite(value) || value < 0) {
    return 0;
  }

  return value * multiplier;
};
