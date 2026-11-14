import { describe, expect, it } from "vitest";
import { computeIntegerSliderValue } from "../../../src/components/ha-form/ha-form-integer";
import type { HaFormIntegerSchema } from "../../../src/components/ha-form/types";

const schema = (extra: Partial<HaFormIntegerSchema>): HaFormIntegerSchema => ({
  type: "integer",
  name: "level",
  valueMin: 0,
  valueMax: 100,
  ...extra,
});

describe("computeIntegerSliderValue", () => {
  it("returns the data when there is some", () => {
    expect(computeIntegerSliderValue(schema({ required: true }), 30)).toBe(30);
  });

  it("returns the suggested value of a required field without data", () => {
    expect(
      computeIntegerSliderValue(
        schema({ required: true, description: { suggested_value: 50 } })
      )
    ).toBe(50);
  });

  it("returns a default of 0 for a required field without data", () => {
    expect(
      computeIntegerSliderValue(
        schema({ required: true, valueMin: -10, default: 0 })
      )
    ).toBe(0);
  });

  it("falls back to the minimum for a required field without data", () => {
    expect(
      computeIntegerSliderValue(schema({ required: true, valueMin: 5 }))
    ).toBe(5);
  });
});
