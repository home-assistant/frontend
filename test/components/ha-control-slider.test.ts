import { describe, it, expect, afterEach } from "vitest";
import "../../src/components/ha-control-slider";
import type { HaControlSlider } from "../../src/components/ha-control-slider";

const createSlider = (props: Partial<HaControlSlider>): HaControlSlider => {
  const el = document.createElement("ha-control-slider") as HaControlSlider;
  Object.assign(el, props);
  return el;
};

describe("ha-control-slider value mapping", () => {
  afterEach(() => {
    document.dir = "ltr";
  });

  it("maps a vertical slider bottom-to-top in LTR", () => {
    const el = createSlider({ vertical: true, min: 0, max: 100 });
    expect(el.valueToPercentage(100)).toBe(1);
    expect(el.valueToPercentage(0)).toBe(0);
    expect(el.percentageToValue(1)).toBe(100);
  });

  it("does not invert a vertical slider in RTL", () => {
    document.dir = "rtl";
    const el = createSlider({ vertical: true, min: 0, max: 100 });
    // A vertical slider must ignore RTL: the top stays at the maximum.
    expect(el.valueToPercentage(100)).toBe(1);
    expect(el.percentageToValue(1)).toBe(100);
    expect(el.percentageToValue(0)).toBe(0);
  });

  it("still mirrors a horizontal slider in RTL", () => {
    document.dir = "rtl";
    const el = createSlider({ vertical: false, min: 0, max: 100 });
    expect(el.valueToPercentage(100)).toBe(0);
    expect(el.percentageToValue(0)).toBe(100);
  });

  it("keeps an explicitly inverted vertical slider inverted in both directions", () => {
    const el = createSlider({
      vertical: true,
      inverted: true,
      min: 0,
      max: 100,
    });
    expect(el.valueToPercentage(100)).toBe(0);
    document.dir = "rtl";
    expect(el.valueToPercentage(100)).toBe(0);
  });
});
