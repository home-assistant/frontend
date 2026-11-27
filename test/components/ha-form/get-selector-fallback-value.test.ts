import { describe, expect, it } from "vitest";
import { DEFAULT_MIN_KELVIN } from "../../../src/common/color/convert-light-color";
import { getSelectorFallbackValue } from "../../../src/components/ha-form/get-selector-fallback-value";

describe("getSelectorFallbackValue", () => {
  it("returns the constant selector value", () => {
    expect(getSelectorFallbackValue({ constant: { value: "fixed" } })).toBe(
      "fixed"
    );
    expect(getSelectorFallbackValue({ constant: { value: 0 } })).toBe(0);
    expect(getSelectorFallbackValue({ constant: { value: false } })).toBe(
      false
    );
  });

  it("returns false for boolean selectors", () => {
    expect(getSelectorFallbackValue({ boolean: null })).toBe(false);
    expect(getSelectorFallbackValue({ boolean: {} })).toBe(false);
  });

  it("returns number min, or 0 when min is omitted", () => {
    expect(getSelectorFallbackValue({ number: { min: 2000 } })).toBe(2000);
    expect(getSelectorFallbackValue({ number: { min: 0, max: 100 } })).toBe(0);
    expect(getSelectorFallbackValue({ number: null })).toBe(0);
  });

  it("returns kelvin min for color_temp, falling back to DEFAULT_MIN_KELVIN", () => {
    expect(
      getSelectorFallbackValue({
        color_temp: { unit: "kelvin", min: 2000, max: 6500 },
      })
    ).toBe(2000);
    expect(getSelectorFallbackValue({ color_temp: { unit: "kelvin" } })).toBe(
      DEFAULT_MIN_KELVIN
    );
  });

  it("uses the targeted lights' Kelvin minimum when they report a range", () => {
    const selector = {
      color_temp: { unit: "kelvin" as const, min: 2000, max: 6500 },
    };
    const states = {
      "light.warm": {
        attributes: {
          min_color_temp_kelvin: 1600,
          max_color_temp_kelvin: 4000,
        },
      },
      "light.other": {
        attributes: {},
      },
    };

    expect(getSelectorFallbackValue(selector, states)).toBe(1600);
    expect(
      getSelectorFallbackValue(selector, {
        "light.warm": {
          attributes: {
            min_color_temp_kelvin: 1600,
            max_color_temp_kelvin: 4000,
          },
        },
        "light.daylight": {
          attributes: {
            min_color_temp_kelvin: 2000,
            max_color_temp_kelvin: 6500,
          },
        },
      })
    ).toBe(2000);
    expect(
      getSelectorFallbackValue(selector, {
        "light.bulb": { attributes: {} },
      })
    ).toBe(2000);
  });

  it("returns mired min for color_temp, including legacy min_mireds", () => {
    expect(
      getSelectorFallbackValue({
        color_temp: { unit: "mired", min: 154, max: 500 },
      })
    ).toBe(154);
    expect(getSelectorFallbackValue({ color_temp: { min_mireds: 160 } })).toBe(
      160
    );
    expect(getSelectorFallbackValue({ color_temp: null })).toBe(153);
  });

  it("returns undefined when the selector has no displayed fallback", () => {
    expect(getSelectorFallbackValue({ text: null })).toBeUndefined();
    expect(getSelectorFallbackValue({ entity: null })).toBeUndefined();
    expect(getSelectorFallbackValue({ target: {} })).toBeUndefined();
  });
});
