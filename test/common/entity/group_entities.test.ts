import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it, vi } from "vitest";
import { toggleGroupEntities } from "../../../src/common/entity/group_entities";
import { CoverEntityFeature } from "../../../src/data/feature/cover_entity_feature";
import type { HomeAssistant } from "../../../src/types";

const cover = (
  entityId: string,
  state: string,
  supportedFeatures: number
): HassEntity =>
  ({
    entity_id: entityId,
    state,
    attributes: { supported_features: supportedFeatures },
  }) as HassEntity;

const TILT_ONLY =
  CoverEntityFeature.OPEN_TILT +
  CoverEntityFeature.CLOSE_TILT +
  CoverEntityFeature.STOP_TILT;
const OPEN_CLOSE = CoverEntityFeature.OPEN + CoverEntityFeature.CLOSE;

const mockHass = () => {
  const callService = vi.fn();
  return { hass: { callService } as unknown as HomeAssistant, callService };
};

describe("toggleGroupEntities", () => {
  it("Uses tilt services for a group of tilt-only covers", () => {
    const { hass, callService } = mockHass();
    toggleGroupEntities(hass, [cover("cover.tilt", "closed", TILT_ONLY)]);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: ["cover.tilt"],
    });
  });

  it("Splits the call when a group mixes tilt-only and regular covers", () => {
    const { hass, callService } = mockHass();
    toggleGroupEntities(hass, [
      cover("cover.regular", "closed", OPEN_CLOSE),
      cover("cover.tilt", "closed", TILT_ONLY),
    ]);

    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenCalledWith("cover", "open_cover", {
      entity_id: ["cover.regular"],
    });
    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: ["cover.tilt"],
    });
  });

  it("Stops the tilt of tilt-only covers", () => {
    const { hass, callService } = mockHass();
    toggleGroupEntities(hass, [
      cover("cover.regular", "opening", OPEN_CLOSE),
      cover("cover.tilt", "closed", TILT_ONLY),
    ]);

    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenCalledWith("cover", "stop_cover", {
      entity_id: ["cover.regular"],
    });
    expect(callService).toHaveBeenCalledWith("cover", "stop_cover_tilt", {
      entity_id: ["cover.tilt"],
    });
  });

  it("Skips tilt-only covers that can't stop", () => {
    const { hass, callService } = mockHass();
    toggleGroupEntities(hass, [
      cover("cover.regular", "opening", OPEN_CLOSE),
      cover(
        "cover.tilt",
        "closed",
        CoverEntityFeature.OPEN_TILT + CoverEntityFeature.CLOSE_TILT
      ),
    ]);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("cover", "stop_cover", {
      entity_id: ["cover.regular"],
    });
  });

  it("Uses a single call for a group of regular covers", () => {
    const { hass, callService } = mockHass();
    toggleGroupEntities(hass, [
      cover("cover.one", "open", OPEN_CLOSE),
      cover("cover.two", "open", OPEN_CLOSE),
    ]);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("cover", "close_cover", {
      entity_id: ["cover.one", "cover.two"],
    });
  });
});
