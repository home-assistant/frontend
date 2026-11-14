import { describe, expect, it } from "vitest";
import { computeLocationFormValue } from "../../../src/components/ha-selector/ha-selector-location";

describe("computeLocationFormValue", () => {
  it("rounds an edited radius", () => {
    expect(
      computeLocationFormValue(
        { location: { radius: true } },
        { latitude: 1, longitude: 2, radius: 600.4 }
      )
    ).toEqual({ latitude: 1, longitude: 2, radius: 600 });
  });

  it("leaves out a radius the value does not have", () => {
    expect(
      computeLocationFormValue(
        { location: { radius: true } },
        { latitude: 3, longitude: 2 }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });

  it("keeps a read-only radius", () => {
    expect(
      computeLocationFormValue(
        { location: { radius: true, radius_readonly: true } },
        { latitude: 3, longitude: 2, radius: 500 }
      )
    ).toEqual({ latitude: 3, longitude: 2, radius: 500 });
  });

  it("leaves out the radius when the selector has none", () => {
    expect(
      computeLocationFormValue(
        { location: {} },
        { latitude: 3, longitude: 2, radius: 500 }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });
});
