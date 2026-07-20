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

describe("ha-control-slider display rounding", () => {
  // A fan with 91 speeds reports percentage_step = 100 / 91 ≈ 1.0989, so a
  // stepped percentage such as 29 snaps to 26 * step = 28.5714…
  const FAN_STEP = 100 / 91;

  let sliders: HaControlSlider[] = [];

  const mountSlider = async (
    props: Partial<HaControlSlider>
  ): Promise<HaControlSlider> => {
    const el = createSlider(props);
    document.body.appendChild(el);
    sliders.push(el);
    await el.updateComplete;
    return el;
  };

  const ariaValueNow = (el: HaControlSlider) =>
    el
      .shadowRoot!.querySelector('[role="slider"]')!
      .getAttribute("aria-valuenow");

  const tooltipText = (el: HaControlSlider) =>
    el.shadowRoot!.querySelector(".tooltip")!.textContent!.trim();

  afterEach(() => {
    sliders.forEach((el) => el.remove());
    sliders = [];
  });

  it("shows the fractional stepped value by default", async () => {
    const el = await mountSlider({ step: FAN_STEP, value: 29 });
    expect(tooltipText(el)).toBe("28.57");
    expect(ariaValueNow(el)).toBe(el.steppedValue(29).toString());
  });

  it("rounds the displayed value to an integer when round-value is set", async () => {
    const el = await mountSlider({
      step: FAN_STEP,
      value: 29,
      roundValue: true,
    });
    expect(tooltipText(el)).toBe("29");
    expect(ariaValueNow(el)).toBe("29");
  });

  it("still snaps to the real step grid when rounding the display", async () => {
    const el = await mountSlider({
      step: FAN_STEP,
      value: 29,
      roundValue: true,
    });
    // Only the shown value is rounded; the handle keeps the fractional step, so
    // the number of speed steps (and keyboard granularity) is preserved.
    expect(el.steppedValue(29)).toBeCloseTo(28.5714, 3);
  });

  it("keeps decimal steps intact unless round-value is set", async () => {
    // A temperature-style slider must keep showing halves.
    const el = await mountSlider({ step: 0.5, value: 21.5 });
    expect(tooltipText(el)).toBe("21.5");
    expect(ariaValueNow(el)).toBe("21.5");
  });
});
