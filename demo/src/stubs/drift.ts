// Made-up values for the mock history and statistics that look like a real
// home and are the same on every load, so a chart doesn't change each time
// the page opens.

const HOUR = 60 * 60 * 1000;

/** A number from 0 up to 1 for each key, the same every time. */
export const hashFraction = (key: string): number => {
  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }

  return hash / 2147483647;
};

/**
 * How far a value drifts from its state: 10% of it, or 5% above 80, as for a
 * temperature or a power reading. A state of 0 drifts by up to 1.
 */
export const driftScale = (value: number): number =>
  value === 0 ? 1 : Math.abs(value) * (Math.abs(value) > 80 ? 0.05 : 0.1);

const wave = (key: string, time: number, period: number): number =>
  Math.sin((2 * Math.PI * time) / period + 2 * Math.PI * hashFraction(key));

/**
 * The value of an entity at a time, drifting slowly around its state: a swing
 * over the day and two faster, smaller ones, each starting at a point picked
 * from the entity ID.
 */
export const driftedValue = (
  key: string,
  time: number,
  value: number
): number =>
  value +
  driftScale(value) *
    (0.6 * wave(`${key}:day`, time, 24 * HOUR) +
      0.3 * wave(`${key}:hours`, time, 5 * HOUR) +
      0.1 * wave(`${key}:hour`, time, 1.3 * HOUR));
