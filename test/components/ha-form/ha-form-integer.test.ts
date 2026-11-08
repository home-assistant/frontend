import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HaFormInteger } from "../../../src/components/ha-form/ha-form-integer";
import type { HaFormIntegerSchema } from "../../../src/components/ha-form/types";

class HaSliderStub extends HTMLElement {
  public value?: unknown;
}

// Stub the slider so the test reads the value ha-form-integer passes to it.
vi.mock("../../../src/components/ha-slider", () => {
  if (!customElements.get("ha-slider")) {
    customElements.define(
      "ha-slider",
      HaSliderStub as unknown as CustomElementConstructor
    );
  }
  return {};
});
vi.mock("../../../src/components/ha-checkbox", () => ({}));
vi.mock("../../../src/components/input/ha-input", () => ({}));

beforeAll(async () => {
  await import("../../../src/components/ha-form/ha-form-integer");
});

describe("<ha-form-integer>", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const sliderValue = async (schema: Partial<HaFormIntegerSchema>) => {
    const element = document.createElement("ha-form-integer") as HaFormInteger;
    element.schema = {
      type: "integer",
      name: "level",
      valueMin: 0,
      valueMax: 100,
      ...schema,
    } as HaFormIntegerSchema;
    document.body.append(element);
    await element.updateComplete;
    return (element.shadowRoot!.querySelector("ha-slider") as HaSliderStub)
      .value;
  };

  it("shows the suggested value on a required slider without data", async () => {
    expect(
      await sliderValue({
        required: true,
        description: { suggested_value: 50 },
      })
    ).toBe(50);
  });

  it("shows a default of 0 on a required slider without data", async () => {
    expect(
      await sliderValue({ required: true, valueMin: -10, default: 0 })
    ).toBe(0);
  });
});
