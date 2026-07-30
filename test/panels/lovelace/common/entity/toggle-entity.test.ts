import { describe, expect, it, vi } from "vitest";
import { CoverEntityFeature } from "../../../../../src/data/feature/cover_entity_feature";
import { toggleEntity } from "../../../../../src/panels/lovelace/common/entity/toggle-entity";
import type { HomeAssistant } from "../../../../../src/types";

const TILT_ONLY = CoverEntityFeature.OPEN_TILT + CoverEntityFeature.CLOSE_TILT;

const mockHass = (state: string, supportedFeatures = TILT_ONLY) => {
  const callService = vi.fn();
  return {
    hass: {
      states: {
        "cover.tilt": {
          entity_id: "cover.tilt",
          state,
          attributes: { supported_features: supportedFeatures },
        },
      },
      callService,
    } as unknown as HomeAssistant,
    callService,
  };
};

describe("toggleEntity", () => {
  it("Opens the tilt of a closed tilt-only cover", () => {
    const { hass, callService } = mockHass("closed");
    toggleEntity(hass, "cover.tilt");

    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: "cover.tilt",
    });
  });

  it("Closes the tilt of an open tilt-only cover", () => {
    const { hass, callService } = mockHass("open");
    toggleEntity(hass, "cover.tilt");

    expect(callService).toHaveBeenCalledWith("cover", "close_cover_tilt", {
      entity_id: "cover.tilt",
    });
  });

  it("Lets core pick the direction when the tilt-only cover state is unknown", () => {
    const { hass, callService } = mockHass("unknown");
    toggleEntity(hass, "cover.tilt");

    expect(callService).toHaveBeenCalledWith("cover", "toggle_cover_tilt", {
      entity_id: "cover.tilt",
    });
  });

  it("Uses open/close for covers supporting it", () => {
    const { hass, callService } = mockHass(
      "closed",
      CoverEntityFeature.OPEN + CoverEntityFeature.CLOSE
    );
    toggleEntity(hass, "cover.tilt");

    expect(callService).toHaveBeenCalledWith("cover", "open_cover", {
      entity_id: "cover.tilt",
    });
  });
});
