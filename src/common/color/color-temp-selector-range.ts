interface EntityWithColorTemp {
  attributes?: Record<string, unknown>;
}

const finiteRange = (
  min: unknown,
  max: unknown
): { min: number; max: number } | undefined => {
  if (typeof min !== "number" || typeof max !== "number") {
    return undefined;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return undefined;
  }
  return { min, max };
};

/**
 * Kelvin bounds reported by the given entity states.
 *
 * Several lights use the overlap of their ranges, because one
 * `color_temp_kelvin` value is sent to every target. When the ranges do not
 * overlap, the result spans the widest range so it still has a valid min and
 * max. Entities without a finite range are ignored. Returns undefined when
 * nothing reports a range, so the caller keeps the selector min and max.
 */
export const kelvinRangeFromEntityStates = (
  states: Readonly<Record<string, EntityWithColorTemp | undefined>> | undefined
): { min: number; max: number } | undefined => {
  if (!states) {
    return undefined;
  }

  const ranges: { min: number; max: number }[] = [];
  for (const state of Object.values(states)) {
    const range = finiteRange(
      state?.attributes?.min_color_temp_kelvin,
      state?.attributes?.max_color_temp_kelvin
    );
    if (range) {
      ranges.push(range);
    }
  }
  if (!ranges.length) {
    return undefined;
  }

  let min = Math.max(...ranges.map((range) => range.min));
  let max = Math.min(...ranges.map((range) => range.max));
  if (min > max) {
    min = Math.min(...ranges.map((range) => range.min));
    max = Math.max(...ranges.map((range) => range.max));
  }
  return { min, max };
};
