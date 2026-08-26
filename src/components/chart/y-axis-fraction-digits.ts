// A range smaller than this fraction of the axis magnitude is floating-point
// noise (e.g. from summed statistics), not real precision.
const NEGLIGIBLE_RANGE_RATIO = 1e-10;

// Derive the number of decimal digits to use for Y-axis labels from the
// observed data range. We mirror how ECharts sizes its ticks: it splits the
// range into ~5 intervals (its default `splitNumber`) and rounds that raw
// interval to a "nice" 1/2/3/5×10ⁿ value, then reports the decimals that nice
// interval needs. This matches the precision ECharts actually renders, so
// labels are neither truncated to identical values nor padded with extra zeros.
export function computeYAxisFractionDigits(
  min: number,
  max: number,
  // Bar axes render from 0, so union the extent with 0 to match.
  includeZero = false
): number {
  const lo = includeZero ? Math.min(min, 0) : min;
  const hi = includeZero ? Math.max(max, 0) : max;
  const range = hi - lo;
  if (!Number.isFinite(range) || range <= 0) return 1;
  // A near-zero range is fp noise; deriving digits from it would pad the labels
  // with a tail of zeros (e.g. "0.20000000000000"), so treat it as flat.
  const magnitude = Math.max(Math.abs(lo), Math.abs(hi));
  if (range <= magnitude * NEGLIGIBLE_RANGE_RATIO) return 1;
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

// The span ECharts multiplies `boundaryGap` by. It falls back to the magnitude
// of the minimum when the data is flat, so a constant series still gets padded.
const spanOf = ({ min, max }: YAxisExtentValues): number =>
  max - min || Math.abs(min);

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
  // Set for bar axes anchored at 0, so precision reflects the 0-based range.
  includeZero?: boolean;
  // The `[below, above]` fractions of the data span that `yAxis.boundaryGap`
  // adds to the extent. ECharts sizes its ticks from the widened extent, so
  // fold the same padding in here or the derived precision can disagree with
  // the ticks actually rendered.
  boundaryGap?: readonly [number, number];
  onFractionDigits: (digits: number) => void;
}): {
  min: (values: YAxisExtentValues) => number | undefined;
  max: (values: YAxisExtentValues) => number | undefined;
} {
  const { min, max, includeZero, boundaryGap, onFractionDigits } = options;
  const [gapBelow, gapAbove] = boundaryGap ?? [0, 0];
  return {
    min: (values) => {
      const resolvedMin = resolveYAxisBound(min, values);
      const resolvedMax = resolveYAxisBound(max, values);
      // ECharts drops the gap on a side whose bound is fixed, so a resolved
      // bound is used as-is. Both sides scale the same unpadded data span.
      const span = spanOf(values);
      const extentMin = resolvedMin ?? values.min - gapBelow * span;
      const extentMax = resolvedMax ?? values.max + gapAbove * span;
      onFractionDigits(
        computeYAxisFractionDigits(extentMin, extentMax, includeZero)
      );
      return resolvedMin;
    },
    max: (values) => resolveYAxisBound(max, values),
  };
}
