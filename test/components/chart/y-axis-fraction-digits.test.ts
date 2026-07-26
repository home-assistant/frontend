import { describe, expect, it, vi } from "vitest";
import {
  computeYAxisFractionDigits,
  createYAxisPrecisionBounds,
} from "../../../src/components/chart/y-axis-fraction-digits";

describe("computeYAxisFractionDigits", () => {
  it("uses two decimals for a sub-unit range (e.g. gas prices around 1.85-2.00)", () => {
    expect(computeYAxisFractionDigits(1.85, 2.0)).toBe(2);
  });

  it("uses no decimals for integer-scale ranges", () => {
    expect(computeYAxisFractionDigits(0, 100)).toBe(0);
    expect(computeYAxisFractionDigits(0, 1000)).toBe(0);
  });

  it("uses no decimals when the range covers an order of magnitude or more", () => {
    expect(computeYAxisFractionDigits(0, 10)).toBe(0);
    expect(computeYAxisFractionDigits(0, 50)).toBe(0);
  });

  it("uses one decimal for ranges around one", () => {
    expect(computeYAxisFractionDigits(0, 1)).toBe(1);
    expect(computeYAxisFractionDigits(0, 2)).toBe(1);
  });

  it("uses more decimals as the range shrinks", () => {
    // Values match the decimals ECharts actually renders for these ranges
    // (tick interval 0.01 -> 2 decimals, 0.001 -> 3 decimals).
    expect(computeYAxisFractionDigits(0, 0.05)).toBe(2);
    expect(computeYAxisFractionDigits(0, 0.005)).toBe(3);
  });

  it("matches the tick interval without over-padding on a narrow range", () => {
    // A zoomed-in range that steps by 0.01 needs 2 decimals, not 3.
    expect(computeYAxisFractionDigits(21.02, 21.08)).toBe(2);
    // Ranges whose nice interval carries to a coarser power of ten stay tight.
    expect(computeYAxisFractionDigits(15, 15.004)).toBe(3);
    expect(computeYAxisFractionDigits(0, 0.04)).toBe(2);
  });

  it("falls back to one decimal when min equals max", () => {
    expect(computeYAxisFractionDigits(1.5, 1.5)).toBe(1);
  });

  it("treats a floating-point-noise range as flat (issue #53180)", () => {
    expect(computeYAxisFractionDigits(0.3, 0.3 + 1e-16)).toBe(1);
    expect(computeYAxisFractionDigits(0.2, 0.20000000000004547)).toBe(1);
    expect(computeYAxisFractionDigits(1_000_000, 1_000_000.00001)).toBe(1);
  });

  it("keeps precision for a genuinely narrow, non-noise range", () => {
    expect(computeYAxisFractionDigits(1e-6, 3e-6)).toBe(7);
  });

  it("unions the extent with zero for anchored (bar) axes", () => {
    expect(computeYAxisFractionDigits(0.3, 0.3, true)).toBe(2);
    expect(
      computeYAxisFractionDigits(0.29999999999999993, 0.3000000000000001, true)
    ).toBe(2);
  });

  it("falls back to one decimal when range is non-finite", () => {
    expect(computeYAxisFractionDigits(Infinity, -Infinity)).toBe(1);
    expect(computeYAxisFractionDigits(NaN, 1)).toBe(1);
  });

  it("handles negative-to-positive ranges by the magnitude of the range", () => {
    expect(computeYAxisFractionDigits(-2, 2)).toBe(0);
    expect(computeYAxisFractionDigits(-0.1, 0.1)).toBe(2);
  });
});

describe("createYAxisPrecisionBounds", () => {
  it("computes digits from the visible extent when no bounds are set", () => {
    const onFractionDigits = vi.fn();
    const { min, max } = createYAxisPrecisionBounds({ onFractionDigits });

    // Zoomed-out extent -> coarse precision, callbacks leave scaling to ECharts
    expect(min({ min: 0, max: 100 })).toBeUndefined();
    expect(max({ min: 0, max: 100 })).toBeUndefined();
    expect(onFractionDigits).toHaveBeenLastCalledWith(0);

    // Zoomed-in narrow extent -> more decimals so ticks stay distinct
    min({ min: 21.02, max: 21.08 });
    expect(onFractionDigits).toHaveBeenLastCalledWith(2);
  });

  it("computes digits from numeric bounds and returns them unchanged", () => {
    const onFractionDigits = vi.fn();
    const { min, max } = createYAxisPrecisionBounds({
      min: 1.85,
      max: 2,
      onFractionDigits,
    });

    // Fixed bounds pin the range, so the visible extent is ignored
    expect(min({ min: 1.9, max: 1.95 })).toBe(1.85);
    expect(max({ min: 1.9, max: 1.95 })).toBe(2);
    expect(onFractionDigits).toHaveBeenLastCalledWith(2);
  });

  it("resolves function bounds and passes their result through", () => {
    const onFractionDigits = vi.fn();
    const { min, max } = createYAxisPrecisionBounds({
      min: ({ min: dataMin }) => dataMin - 1,
      max: ({ max: dataMax }) => dataMax + 1,
      onFractionDigits,
    });

    expect(min({ min: 10, max: 11 })).toBe(9);
    expect(max({ min: 10, max: 11 })).toBe(12);
    // Range widened to 9..12 -> single decimal
    expect(onFractionDigits).toHaveBeenLastCalledWith(1);
  });

  it("unions the extent with zero for anchored axes", () => {
    const onFractionDigits = vi.fn();
    const { min } = createYAxisPrecisionBounds({
      includeZero: true,
      onFractionDigits,
    });

    // Data sits at 20..25, but a bar axis renders from 0 -> coarse precision
    min({ min: 20, max: 25 });
    expect(onFractionDigits).toHaveBeenLastCalledWith(0);

    // Small visible max close to zero -> more decimals
    min({ min: 0.02, max: 0.05 });
    expect(onFractionDigits).toHaveBeenLastCalledWith(2);
  });

  it("does not over-pad when the visible extent collapses to noise", () => {
    const onFractionDigits = vi.fn();
    const { min } = createYAxisPrecisionBounds({ onFractionDigits });

    min({ min: 0.3, max: 0.3 + 1e-15 });
    expect(onFractionDigits).toHaveBeenLastCalledWith(1);
  });
});
