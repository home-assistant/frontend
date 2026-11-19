import { describe, expect, it } from "vitest";
import { computeLocationSelectorValue } from "../../../src/components/ha-selector/compute-location-selector-value";

describe("computeLocationSelectorValue", () => {
  it("rounds an edited radius", () => {
    expect(
      computeLocationSelectorValue(
        { location: { radius: true } },
        { latitude: 1, longitude: 2, radius: 600.4 }
      )
    ).toEqual({ latitude: 1, longitude: 2, radius: 600 });
  });

  it("falls back to the default radius the map shows", () => {
    expect(
      computeLocationSelectorValue(
        { location: { radius: true } },
        { latitude: 3, longitude: 2 }
      )
    ).toEqual({ latitude: 3, longitude: 2, radius: 1000 });
  });

  it("leaves out a radius the user cleared", () => {
    expect(
      computeLocationSelectorValue(
        { location: { radius: true } },
        { latitude: 3, longitude: 2, radius: undefined }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });

  it("keeps a read-only radius unrounded", () => {
    expect(
      computeLocationSelectorValue(
        { location: { radius: true, radius_readonly: true } },
        { latitude: 3, longitude: 2, radius: 65.5 }
      )
    ).toEqual({ latitude: 3, longitude: 2, radius: 65.5 });
  });

  it("leaves out the radius when the selector has none", () => {
    expect(
      computeLocationSelectorValue(
        { location: {} },
        { latitude: 3, longitude: 2, radius: 500 }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });
});
