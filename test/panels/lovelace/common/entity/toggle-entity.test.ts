import { describe, expect, it, vi } from "vitest";

import { CoverEntityFeature } from "../../../../../src/data/cover";
import { toggleEntity } from "../../../../../src/panels/lovelace/common/entity/toggle-entity";
import { handleAction } from "../../../../../src/panels/lovelace/common/handle-action";
import type { HomeAssistant } from "../../../../../src/types";

const TILT_ONLY_FEATURES =
  CoverEntityFeature.OPEN_TILT +
  CoverEntityFeature.CLOSE_TILT +
  CoverEntityFeature.SET_TILT_POSITION;

const makeHass = (
  entityId: string,
  attributes: Record<string, unknown>,
  state = "open"
) => {
  const callService = vi.fn();
  const hass = {
    states: { [entityId]: { entity_id: entityId, state, attributes } },
    callService,
  } as unknown as HomeAssistant;
  return { hass, callService };
};

describe("toggleEntity", () => {
  it("closes the tilt of an open tilt only cover", () => {
    const { hass, callService } = makeHass("cover.blinds", {
      current_tilt_position: 50,
      supported_features: TILT_ONLY_FEATURES,
    });

    toggleEntity(hass, "cover.blinds");

    expect(callService).toHaveBeenCalledWith("cover", "close_cover_tilt", {
      entity_id: "cover.blinds",
    });
  });

  it("opens the tilt of a closed tilt only cover", () => {
    const { hass, callService } = makeHass("cover.blinds", {
      current_tilt_position: 0,
      supported_features: TILT_ONLY_FEATURES,
    });

    toggleEntity(hass, "cover.blinds");

    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: "cover.blinds",
    });
  });

  // A cover that supports stop but neither open nor close is still only
  // toggleable through its tilt.
  it("uses the tilt actions for a cover that also supports stop", () => {
    const { hass, callService } = makeHass("cover.blinds", {
      current_tilt_position: 50,
      supported_features: TILT_ONLY_FEATURES + CoverEntityFeature.STOP,
    });

    toggleEntity(hass, "cover.blinds");

    expect(callService).toHaveBeenCalledWith("cover", "close_cover_tilt", {
      entity_id: "cover.blinds",
    });
  });

  // The tilt actions must not be used for a cover that has no tilt, even
  // though this path is reached without checking canToggleState.
  it.each([
    ["stop only", CoverEntityFeature.STOP],
    ["stop tilt only", CoverEntityFeature.STOP_TILT],
    ["open tilt only", CoverEntityFeature.OPEN_TILT],
    ["no features", 0],
  ])("uses the regular actions for a cover with %s", (_name, features) => {
    const { hass, callService } = makeHass("cover.blinds", {
      supported_features: features,
    });

    toggleEntity(hass, "cover.blinds");

    expect(callService).toHaveBeenCalledWith("cover", "close_cover", {
      entity_id: "cover.blinds",
    });
  });

  it("uses the regular actions for a cover that opens and closes", () => {
    const { hass, callService } = makeHass("cover.garage", {
      supported_features: CoverEntityFeature.OPEN + CoverEntityFeature.CLOSE,
    });

    toggleEntity(hass, "cover.garage");

    expect(callService).toHaveBeenCalledWith("cover", "close_cover", {
      entity_id: "cover.garage",
    });
  });

  it("uses the tilt actions for a configured toggle action", async () => {
    const { hass, callService } = makeHass("cover.blinds", {
      current_tilt_position: 50,
      supported_features: TILT_ONLY_FEATURES,
    });

    await handleAction(
      document.createElement("div"),
      hass,
      { entity: "cover.blinds", tap_action: { action: "toggle" } },
      "tap"
    );

    expect(callService).toHaveBeenCalledWith("cover", "close_cover_tilt", {
      entity_id: "cover.blinds",
    });
  });
});
