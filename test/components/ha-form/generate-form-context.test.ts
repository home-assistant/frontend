import { describe, expect, it } from "vitest";
import { generateFormContext } from "../../../src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../src/components/ha-form/types";

describe("generateFormContext", () => {
  it("returns undefined without any context", () => {
    expect(
      generateFormContext(
        { name: "unit", selector: { unit_of_measurement: {} } },
        { device_class: "temperature" },
        undefined
      )
    ).toBeUndefined();
  });

  it("merges the form, selector config and field-level context in order", () => {
    const schema: HaFormSchema = {
      name: "unit",
      selector: {
        unit_of_measurement: {
          context: {
            filter_device_class: "device_class",
            filter_state_class: "state_class",
          },
        },
      },
      context: { filter_state_class: "other_state_class" },
    };
    expect(
      generateFormContext(
        schema,
        {
          device_class: "temperature",
          state_class: "measurement",
          other_state_class: "total",
        },
        { filter_device_class: "humidity", extra: "kept" }
      )
    ).toEqual({
      extra: "kept",
      filter_device_class: "temperature",
      filter_state_class: "total",
    });
  });
});
