// Derive the number of decimal digits to use for Y-axis labels from the
// observed data range. We estimate the tick interval as `range / 10` (twice
// ECharts' default splitNumber of 5, as a safety margin against finer "nice"
// intervals), then derive `ceil(-log10(interval))`.
export function computeYAxisFractionDigits(min: number, max: number): number {
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) return 1;
  return Math.max(0, Math.ceil(-Math.log10(range / 10)));
}
