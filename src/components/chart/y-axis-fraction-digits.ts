import { intervalScaleEnsureValidExtent } from "echarts/lib/scale/helper";
import { getPrecision, nice, round } from "echarts/lib/util/number";

// A range smaller than this fraction of the axis magnitude is floating-point
// noise (e.g. from summed statistics), not real precision.
const NEGLIGIBLE_RANGE_RATIO = 1e-10;

// Intervals the axis aims for. Passed to ECharts rather than assumed, so the
// precision derived here cannot drift from the ticks it renders.
const SPLIT_NUMBER = 5;

// Fraction of the data span added at each end, so that ECharts' tick rounding —
// which floors the minimum and ceils the maximum to a tick multiple — always has
// something to round away. Quantized states otherwise land exactly on a tick,
// the rounding changes nothing, and area-filled series collapse to zero height.
// Any value between roughly 1e-15 and 1 / SPLIT_NUMBER works: large enough to
// survive float64 addition at the data's magnitude, small enough that it can
// never cross a tick by itself.
const GAP_FRACTION_OF_SPAN = 1e-6;

// Derive the number of decimal digits to use for Y-axis labels from the
// observed data range, by asking ECharts for the same tick interval it will
// render. This matches the precision it actually draws, so labels are neither
// truncated to identical values nor padded with extra zeros.
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
  return getPrecision(nice(range / SPLIT_NUMBER, true));
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

// A constant series has no span for the gap to be a fraction of, so ECharts
// falls back to `Math.abs(min)` when sizing it. That makes the extent unequal,
// which in turn stops `intervalScaleEnsureValidExtent` from applying the ±|v|/2
// expansion a flat series relies on for its window. Run that expansion here and
// return fixed bounds, which also suppresses the gap.
const flatSeriesExtent = (value: number, fixed: [boolean, boolean]) => {
  const [lo, hi] = intervalScaleEnsureValidExtent([value, value], fixed);
  const interval = nice((hi - lo) / SPLIT_NUMBER, true);
  const precision = getPrecision(interval);
  return {
    min: round(Math.floor(lo / interval) * interval, precision),
    max: round(Math.ceil(hi / interval) * interval, precision),
  };
};

// Build the `yAxis` options that keep tick-label precision and the plot-edge gap
// in agreement with the extent ECharts renders. It re-invokes the `min`/`max`
// callbacks with the extent of the visible (zoom-filtered) data on every
// dataZoom, and always before the label formatter runs, so the fraction digits
// recomputed here track the zoomed range. A callback returns `undefined`
// wherever auto-scaling should stand, and a number only where the axis has to be
// pinned: an explicit bound, the zero anchor, or a constant series.
export function createYAxisPrecisionBounds(options: {
  min?: YAxisBound;
  max?: YAxisBound;
  // Set for bar axes anchored at 0, so precision reflects the 0-based range.
  // Such an axis also gets no gap: pushing it below zero would defeat the zero
  // anchoring and leave the bars floating above the axis.
  includeZero?: boolean;
  onFractionDigits: (digits: number) => void;
}): {
  min: (values: YAxisExtentValues) => number | undefined;
  max: (values: YAxisExtentValues) => number | undefined;
  boundaryGap: [number, number];
  splitNumber: number;
} {
  const { min, max, includeZero, onFractionDigits } = options;

  const resolveBounds = (values: YAxisExtentValues) => {
    const resolvedMin = resolveYAxisBound(min, values);
    const resolvedMax = resolveYAxisBound(max, values);
    if (
      includeZero ||
      !Number.isFinite(values.min) ||
      !Number.isFinite(values.max)
    ) {
      return { min: resolvedMin, max: resolvedMax, gap: 0 };
    }
    if (values.min === values.max) {
      const flat = flatSeriesExtent(values.min, [
        resolvedMin !== undefined,
        resolvedMax !== undefined,
      ]);
      return {
        min: resolvedMin ?? flat.min,
        max: resolvedMax ?? flat.max,
        gap: 0,
      };
    }
    const gap = (values.max - values.min) * GAP_FRACTION_OF_SPAN;
    // Never let the gap carry a single-signed series across zero.
    return {
      min: resolvedMin ?? (values.min >= 0 && values.min < gap ? 0 : undefined),
      max:
        resolvedMax ?? (values.max <= 0 && -values.max < gap ? 0 : undefined),
      gap,
    };
  };

  return {
    // Always emit the key. `setOption` merges the Y axis rather than replacing
    // it, so a conditionally spread gap would survive a chart switching to a
    // zero-anchored type and leave its bars floating.
    boundaryGap: includeZero
      ? [0, 0]
      : [GAP_FRACTION_OF_SPAN, GAP_FRACTION_OF_SPAN],
    splitNumber: SPLIT_NUMBER,
    min: (values) => {
      const bounds = resolveBounds(values);
      onFractionDigits(
        computeYAxisFractionDigits(
          bounds.min ?? values.min - bounds.gap,
          bounds.max ?? values.max + bounds.gap,
          includeZero
        )
      );
      return bounds.min;
    },
    max: (values) => resolveBounds(values).max,
  };
}
