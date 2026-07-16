// Derive the number of decimal digits to use for Y-axis labels from the
// observed data range. We mirror how ECharts sizes its ticks: it splits the
// range into ~5 intervals (its default `splitNumber`) and rounds that raw
// interval to a "nice" 1/2/3/5×10ⁿ value, then reports the decimals that nice
// interval needs. This matches the precision ECharts actually renders, so
// labels are neither truncated to identical values nor padded with extra zeros.
export function computeYAxisFractionDigits(min: number, max: number): number {
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) return 1;
  const rawInterval = range / 5;
  const exponent = Math.floor(Math.log10(rawInterval));
  const mantissa = rawInterval / 10 ** exponent; // in [1, 10)
  // Rounding the mantissa to a nice value only ever carries to the next power
  // of ten (mantissa ≥ 7 → 10), which needs one fewer decimal.
  const niceExponent = mantissa >= 7 ? exponent + 1 : exponent;
  return Math.max(0, -niceExponent);
}

interface YAxisExtentValues {
  min: number;
  max: number;
}

type YAxisBound =
  number | ((values: YAxisExtentValues) => number | undefined) | undefined;

const resolveYAxisBound = (
  bound: YAxisBound,
  values: YAxisExtentValues
): number | undefined => (typeof bound === "function" ? bound(values) : bound);

// Wrap the Y-axis `min`/`max` options in callbacks so the tick-label precision
// tracks the currently visible axis extent. ECharts re-invokes these callbacks
// with the extent of the visible (zoom-filtered) data on every dataZoom, and
// always before the label formatter runs, so recomputing the fraction digits
// here keeps zoomed-in labels distinct. The callbacks return the original
// bounds unchanged, so auto-scaling still applies when a bound is not set.
export function createYAxisPrecisionBounds(options: {
  min?: YAxisBound;
  max?: YAxisBound;
  // Axes without `scale: true` (e.g. bar charts) stay anchored at 0, so the
  // rendered ticks span from 0 even when the data does not. Union the extent
  // with 0 to match the labels ECharts actually draws.
  includeZero?: boolean;
  onFractionDigits: (digits: number) => void;
}): {
  min: (values: YAxisExtentValues) => number | undefined;
  max: (values: YAxisExtentValues) => number | undefined;
} {
  const { min, max, includeZero, onFractionDigits } = options;
  return {
    min: (values) => {
      const resolvedMin = resolveYAxisBound(min, values);
      const resolvedMax = resolveYAxisBound(max, values);
      let extentMin = resolvedMin ?? values.min;
      let extentMax = resolvedMax ?? values.max;
      if (includeZero) {
        extentMin = Math.min(extentMin, 0);
        extentMax = Math.max(extentMax, 0);
      }
      onFractionDigits(computeYAxisFractionDigits(extentMin, extentMax));
      return resolvedMin;
    },
    max: (values) => resolveYAxisBound(max, values),
  };
}
