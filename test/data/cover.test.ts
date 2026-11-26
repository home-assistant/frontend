import { describe, expect, it } from "vitest";
import type { CoverEntity } from "../../src/data/cover";
import { CoverEntityFeature, coverCurrentValue } from "../../src/data/cover";

const TILT_FEATURES =
  CoverEntityFeature.OPEN_TILT +
  CoverEntityFeature.CLOSE_TILT +
  CoverEntityFeature.STOP_TILT;

const cover = (
  state: string,
  supportedFeatures: number,
  attributes: Partial<CoverEntity["attributes"]> = {}
): CoverEntity =>
  ({
    entity_id: "cover.blind",
    state,
    attributes: { supported_features: supportedFeatures, ...attributes },
  }) as CoverEntity;

describe("coverCurrentValue", () => {
  it("uses the state for the tilt of a tilt-only cover without a tilt position", () => {
    expect(coverCurrentValue(cover("closed", TILT_FEATURES), "tilt")).toBe(0);
    expect(coverCurrentValue(cover("opening", TILT_FEATURES), "tilt")).toBe(0);
    expect(coverCurrentValue(cover("open", TILT_FEATURES), "tilt")).toBe(100);
    expect(coverCurrentValue(cover("closing", TILT_FEATURES), "tilt")).toBe(
      100
    );
  });

  it("has no tilt when the state of a tilt-only cover is unknown", () => {
    expect(
      coverCurrentValue(cover("unknown", TILT_FEATURES), "tilt")
    ).toBeUndefined();
    expect(
      coverCurrentValue(cover("unavailable", TILT_FEATURES), "tilt")
    ).toBeUndefined();
  });

  it("prefers the reported tilt position", () => {
    expect(
      coverCurrentValue(
        cover("closed", TILT_FEATURES, { current_tilt_position: 30 }),
        "tilt"
      )
    ).toBe(30);
  });

  it("does not use the state for the tilt when the cover also moves up and down", () => {
    expect(
      coverCurrentValue(
        cover("closed", TILT_FEATURES + CoverEntityFeature.OPEN),
        "tilt"
      )
    ).toBeUndefined();
  });

  it("does not use the state for the tilt when the cover can set its tilt position", () => {
    expect(
      coverCurrentValue(
        cover("closed", TILT_FEATURES + CoverEntityFeature.SET_TILT_POSITION),
        "tilt"
      )
    ).toBeUndefined();
  });
});
