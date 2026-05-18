import { describe, expect, it } from "vitest";
import { computeYAxisFractionDigits } from "../../../src/components/chart/y-axis-fraction-digits";

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
    expect(computeYAxisFractionDigits(0, 0.05)).toBe(3);
    expect(computeYAxisFractionDigits(0, 0.005)).toBe(4);
  });

  it("falls back to one decimal when min equals max", () => {
    expect(computeYAxisFractionDigits(1.5, 1.5)).toBe(1);
  });

  it("falls back to one decimal when range is non-finite", () => {
    expect(computeYAxisFractionDigits(Infinity, -Infinity)).toBe(1);
    expect(computeYAxisFractionDigits(NaN, 1)).toBe(1);
  });

  it("handles negative-to-positive ranges by the magnitude of the range", () => {
    expect(computeYAxisFractionDigits(-2, 2)).toBe(1);
    expect(computeYAxisFractionDigits(-0.1, 0.1)).toBe(2);
  });
});
