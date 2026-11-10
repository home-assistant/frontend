import { describe, expect, it } from "vitest";
import { resolveSelectorContext } from "../../src/data/selector";

describe("resolveSelectorContext", () => {
  it("returns undefined without a selector context", () => {
    expect(
      resolveSelectorContext({ unit_of_measurement: {} }, { dc: "power" })
    ).toBeUndefined();
    expect(
      resolveSelectorContext({ unit_of_measurement: null }, { dc: "power" })
    ).toBeUndefined();
  });

  it("resolves a field that is missing from the data to undefined", () => {
    expect(
      resolveSelectorContext(
        { unit_of_measurement: { context: { filter_device_class: "dc" } } },
        {}
      )
    ).toEqual({ filter_device_class: undefined });
    expect(
      resolveSelectorContext(
        { unit_of_measurement: { context: { filter_device_class: "dc" } } },
        undefined
      )
    ).toEqual({ filter_device_class: undefined });
  });

  it("resolves both keys to the values of the named fields", () => {
    expect(
      resolveSelectorContext(
        {
          unit_of_measurement: {
            context: {
              filter_device_class: "device_class",
              filter_state_class: "state_class",
            },
          },
        },
        { device_class: "temperature", state_class: "measurement" }
      )
    ).toEqual({
      filter_device_class: "temperature",
      filter_state_class: "measurement",
    });
  });
});
